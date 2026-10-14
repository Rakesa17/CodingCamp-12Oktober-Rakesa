document.addEventListener('DOMContentLoaded', () => {
    
    // --- 1. LIVE CLOCK & GREETING ---
    function updateClock() {
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        
        document.getElementById('clock').innerText = `${hours}:${minutes}:${seconds}`;

        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        document.getElementById('date-string').innerText = now.toLocaleDateString('id-ID', options);

        // Dynamic Greeting
        const hour = now.getHours();
        let greeting = "Selamat Malam";
        if (hour >= 5 && hour < 11) greeting = "Selamat Pagi";
        else if (hour >= 11 && hour < 15) greeting = "Selamat Siang";
        else if (hour >= 15 && hour < 18) greeting = "Selamat Sore";

        document.getElementById('greeting-prefix').innerText = greeting;
    }
    setInterval(updateClock, 1000);
    updateClock();

    // --- 2. CUSTOM NAME (LOCAL STORAGE) ---
    const MAX_NAME_LENGTH = 20;
    const DEFAULT_NAME = 'Rakesa';
    const userNameElem = document.getElementById('user-name');
    const savedName = localStorage.getItem('dashboard_user_name');
    if (savedName) userNameElem.innerText = savedName;

    // Blok Enter agar tidak membuat baris baru di dalam contenteditable
    userNameElem.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            userNameElem.blur(); // Langsung trigger blur → simpan nama
        }
    });

    // Batasi panjang maksimal 20 karakter saat mengetik
    userNameElem.addEventListener('input', () => {
        const current = userNameElem.innerText;
        if (current.length > MAX_NAME_LENGTH) {
            // Potong ke 20 karakter dan kembalikan cursor ke akhir
            userNameElem.innerText = current.slice(0, MAX_NAME_LENGTH);
            // Pindahkan cursor ke akhir teks
            const range = document.createRange();
            const sel = window.getSelection();
            range.selectNodeContents(userNameElem);
            range.collapse(false);
            sel.removeAllRanges();
            sel.addRange(range);
        }
    });

    // Saat fokus hilang: trim spasi, fallback ke default jika kosong
    userNameElem.addEventListener('blur', () => {
        // Normalisasi: trim spasi di awal/akhir, collapse spasi berturut-turut
        const trimmed = userNameElem.innerText.replace(/\s+/g, ' ').trim();
        const finalName = trimmed || DEFAULT_NAME;
        userNameElem.innerText = finalName;
        localStorage.setItem('dashboard_user_name', finalName);
    });

    // --- 3. THEME TOGGLE (DARK/LIGHT MODE) ---
    const themeBtn = document.getElementById('theme-toggle');
    const currentTheme = localStorage.getItem('dashboard_theme') || 'light';

    function updateThemeIcon(isDark) {
        themeBtn.textContent = isDark ? '☀️' : '🌙';
        themeBtn.setAttribute('title', isDark ? 'Aktifkan Mode Terang' : 'Aktifkan Mode Gelap');
    }

    // Set tema awal via JS, bukan hardcode di atribut HTML
    if (currentTheme === 'dark') {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
    // Sinkronisasi ikon dengan tema yang dimuat dari localStorage
    updateThemeIcon(currentTheme === 'dark');

    themeBtn.addEventListener('click', () => {
        document.documentElement.classList.toggle('dark');
        const isDark = document.documentElement.classList.contains('dark');
        localStorage.setItem('dashboard_theme', isDark ? 'dark' : 'light');
        updateThemeIcon(isDark);
    });

    // --- 4. FOCUS TIMER (POMODORO) ---
    let timerInterval = null;
    let timeLeft = 25 * 60;

    const timerDisplay = document.getElementById('timer-display');
    const startBtn = document.getElementById('timer-start');
    const stopBtn = document.getElementById('timer-stop');
    const resetBtn = document.getElementById('timer-reset');
    const customMinutesInput = document.getElementById('custom-minutes');

    function updateTimerDisplay() {
        const mins = Math.floor(timeLeft / 60);
        const secs = timeLeft % 60;
        timerDisplay.innerText = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }

    // Bantu fungsi untuk disable/enable tombol Start secara konsisten
    function setTimerRunning(isRunning) {
        startBtn.disabled = isRunning;
    }

    startBtn.addEventListener('click', () => {
        if (timerInterval) return;
        setTimerRunning(true);
        timerInterval = setInterval(() => {
            if (timeLeft > 0) {
                timeLeft--;
                updateTimerDisplay();
            } else {
                clearInterval(timerInterval);
                timerInterval = null;
                setTimerRunning(false);
                // Putar chime DULU sebelum alert() memblokir thread,
                // lalu tunda alert 100ms agar AudioContext sempat merender nada
                if (window._playChimeSound) window._playChimeSound();
                setTimeout(() => {
                    alert('Waktu Fokus Selesai! Saatnya istirahat.');
                }, 100);
            }
        }, 1000);
    });

    stopBtn.addEventListener('click', () => {
        clearInterval(timerInterval);
        timerInterval = null;
        setTimerRunning(false);
    });

    resetBtn.addEventListener('click', () => {
        clearInterval(timerInterval);
        timerInterval = null;
        setTimerRunning(false);
        const mins = parseInt(customMinutesInput.value) || 25;
        timeLeft = mins * 60;
        updateTimerDisplay();
    });

    customMinutesInput.addEventListener('change', () => {
        const mins = parseInt(customMinutesInput.value) || 25;
        timeLeft = mins * 60;
        updateTimerDisplay();
    });

    // --- 5. TO-DO LIST (WITH LOCAL STORAGE & DUPLICATE PREVENT) ---
    const todoForm = document.getElementById('todo-form');
    const todoInput = document.getElementById('todo-input');
    const todoList = document.getElementById('todo-list');
    const taskCount = document.getElementById('task-count');

    let tasks = JSON.parse(localStorage.getItem('dashboard_tasks')) || [];

    function saveAndRenderTasks() {
        localStorage.setItem('dashboard_tasks', JSON.stringify(tasks));
        todoList.innerHTML = '';

        tasks.forEach((task, index) => {
            const li = document.createElement('li');
            li.className = `todo-item ${task.completed ? 'completed' : ''}`;

            const leftDiv = document.createElement('div');
            leftDiv.className = 'todo-item-left';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = task.completed;
            checkbox.addEventListener('change', () => toggleTask(index));

            const span = document.createElement('span');
            // Escape teks agar aman dari XSS
            span.textContent = task.text;

            leftDiv.appendChild(checkbox);
            leftDiv.appendChild(span);

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'btn-delete';
            deleteBtn.textContent = '×';
            deleteBtn.setAttribute('aria-label', `Hapus tugas: ${task.text}`);
            deleteBtn.addEventListener('click', () => {
                if (window._playUncheckSound) window._playUncheckSound();
                deleteTask(index);
            });

            li.appendChild(leftDiv);
            li.appendChild(deleteBtn);
            todoList.appendChild(li);
        });

        const total = tasks.length;
        const done = tasks.filter(t => t.completed).length;
        const pct = total > 0 ? Math.round((done / total) * 100) : 0;

        taskCount.innerText = `${total} Tugas`;

        // Update progress bar
        const fill = document.getElementById('todo-progress-fill');
        const label = document.getElementById('todo-progress-label');
        if (fill && label) {
            fill.style.width = `${pct}%`;
            label.textContent = total > 0
                ? `${done} dari ${total} tugas selesai — ${pct}%`
                : 'Belum ada tugas';
        }
    }

    todoForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = todoInput.value.trim();
        if (!text) return;

        // Prevent Duplicate Challenge
        const isDuplicate = tasks.some(task => task.text.toLowerCase() === text.toLowerCase());
        if (isDuplicate) {
            alert('Tugas ini sudah ada di dalam daftar!');
            return;
        }

        tasks.push({ text, completed: false });
        todoInput.value = '';
        saveAndRenderTasks();
    });

    window.toggleTask = function(index) {
        tasks[index].completed = !tasks[index].completed;
        // Suara berbeda untuk centang vs uncentang
        if (tasks[index].completed) {
            if (window._playCheckSound) window._playCheckSound();
        } else {
            if (window._playUncheckSound) window._playUncheckSound();
        }
        saveAndRenderTasks();
    };

    window.deleteTask = function(index) {
        tasks.splice(index, 1);
        saveAndRenderTasks();
    };

    saveAndRenderTasks();

    // --- 6. QUICK LINKS (WITH LOCAL STORAGE) ---
    const linkForm = document.getElementById('link-form');
    const linkTitle = document.getElementById('link-title');
    const linkUrl = document.getElementById('link-url');
    const linksContainer = document.getElementById('quick-links-container');

    let quickLinks = JSON.parse(localStorage.getItem('dashboard_links')) || [
        { title: 'Google', url: 'https://google.com' },
        { title: 'GitHub', url: 'https://github.com' }
    ];

    function saveAndRenderLinks() {
        localStorage.setItem('dashboard_links', JSON.stringify(quickLinks));
        linksContainer.innerHTML = '';

        quickLinks.forEach((link, index) => {
            const a = document.createElement('a');
            a.className = 'link-chip';
            a.href = link.url;
            a.target = '_blank';
            a.rel = 'noopener noreferrer';

            const icon = document.createTextNode('📌 ');
            const titleText = document.createTextNode(link.title);

            const deleteSpan = document.createElement('span');
            deleteSpan.className = 'link-chip-delete';
            deleteSpan.textContent = '×';
            deleteSpan.setAttribute('aria-label', `Hapus link: ${link.title}`);
            deleteSpan.addEventListener('click', (e) => {
                e.preventDefault();
                if (window._playUncheckSound) window._playUncheckSound();
                deleteLink(index);
            });

            a.appendChild(icon);
            a.appendChild(titleText);
            a.appendChild(deleteSpan);
            linksContainer.appendChild(a);
        });
    }

    linkForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const title = linkTitle.value.trim();
        let url = linkUrl.value.trim();
        if (!title || !url) return;

        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            url = 'https://' + url;
        }

        quickLinks.push({ title, url });
        linkTitle.value = '';
        linkUrl.value = '';
        saveAndRenderLinks();
    });

    window.deleteLink = function(index) {
        quickLinks.splice(index, 1);
        saveAndRenderLinks();
    };

    saveAndRenderLinks();

    // ============================================================
    // --- 7. MOTIVATIONAL QUOTES ---
    // ============================================================
    const QUOTES = [
        { text: "Mulailah dari mana kamu berada. Gunakan apa yang kamu punya. Lakukan apa yang kamu bisa.", author: "Arthur Ashe" },
        { text: "Kesuksesan adalah jumlah dari usaha-usaha kecil yang diulang hari demi hari.", author: "Robert Collier" },
        { text: "Jangan tunggu. Waktu tidak akan pernah tepat.", author: "Napoleon Hill" },
        { text: "Satu-satunya cara untuk melakukan pekerjaan hebat adalah dengan mencintai apa yang kamu lakukan.", author: "Steve Jobs" },
        { text: "Anda tidak harus hebat untuk memulai, tapi Anda harus mulai untuk menjadi hebat.", author: "Zig Ziglar" },
        { text: "Belajarlah seolah kamu akan hidup selamanya, hiduplah seolah kamu akan mati besok.", author: "Mahatma Gandhi" },
        { text: "Keberhasilan bukan tentang tidak pernah jatuh, melainkan tentang selalu bangkit kembali.", author: "Nelson Mandela" },
        { text: "Kode yang bersih selalu tampak seperti ditulis oleh seseorang yang peduli.", author: "Robert C. Martin" },
        { text: "Setiap ahli dulunya adalah seorang pemula.", author: "Helen Hayes" },
        { text: "Impian tidak berhasil kecuali kamu melakukannya.", author: "John C. Maxwell" },
    ];

    (function initQuote() {
        const randomIndex = Math.floor(Math.random() * QUOTES.length);
        const picked = QUOTES[randomIndex];
        document.getElementById('quote-text').textContent = `"${picked.text}"`;
        document.getElementById('quote-author').textContent = `— ${picked.author}`;
    })();

    // ============================================================
    // --- 8. WEB AUDIO API — SOUND EFFECTS (Soft & Elegant) ---
    // ============================================================

    // AudioContext global — dibuat sekali, tidak pernah dibuat ulang
    let audioCtx = null;

    // Async: menunggu resume() selesai sebelum menggunakan currentTime
    async function getAudioContext() {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioCtx.state === 'suspended') {
            await audioCtx.resume();
        }
        return audioCtx;
    }

    // --- Warm-up + suara micro-tap untuk tombol standar (satu listener terpusat) ---
    // Menggabungkan warm-up AudioContext dan tap sound dalam satu handler
    // agar tidak ada dua listener mousedown yang tumpang tindih di document
    document.addEventListener('mousedown', (e) => {
        // Selalu warm-up context di setiap interaksi — memastikan zero latency
        getAudioContext();

        const target = e.target.closest('.btn, .btn-icon');
        if (!target) return;
        const skipIds = ['timer-start', 'timer-stop', 'timer-reset'];
        if (
            skipIds.includes(target.id) ||
            target.classList.contains('btn-icon') ||
            target.type === 'submit' ||
            target.classList.contains('btn-primary')
        ) {
            playTapSound();
        }
    });

    /**
     * playTone — helper internal (async-safe)
     * Menunggu AudioContext aktif sebelum menjadwalkan node,
     * sehingga currentTime selalu akurat dan suara tidak hilang.
     */
    async function playTone(freq1, freq2, dur, peakGain, type = 'sine') {
        try {
            // Guard: pastikan context aktif sebelum menjadwalkan node
            if (audioCtx && audioCtx.state === 'suspended') {
                audioCtx.resume();
            }
            const ctx = await getAudioContext();
            const osc  = ctx.createOscillator();
            const gain = ctx.createGain();
            const t    = ctx.currentTime;

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.type = type;
            osc.frequency.setValueAtTime(freq1, t);
            if (freq2 !== freq1) {
                osc.frequency.exponentialRampToValueAtTime(freq2, t + dur * 0.8);
            }

            gain.gain.setValueAtTime(0, t);
            gain.gain.linearRampToValueAtTime(peakGain, t + 0.008);
            gain.gain.setValueAtTime(peakGain, t + dur * 0.4);
            gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);

            osc.start(t);
            osc.stop(t + dur + 0.01);
        } catch (_) { /* diam-diam jika browser tidak mendukung */ }
    }

    // --- Suara: centang To-Do selesai (nada ganda naik, adem) ---
    function playCheckSound()   { playTone(520, 780, 0.14, 0.06); }

    // --- Suara: uncheck To-Do / hapus item (nada turun, halus) ---
    function playUncheckSound() { playTone(400, 250, 0.16, 0.05); }

    // --- Suara: micro-tap untuk klik tombol UI biasa ---
    function playTapSound()     { playTone(600, 600, 0.07, 0.04); }

    // --- Suara: chime tiga nada naik saat timer selesai (elegan) ---
    // Async agar setiap nada mendapat currentTime yang akurat setelah resume
    async function playChimeSound() {
        const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
        // Pastikan context aktif dulu sebelum menjadwalkan semua nada
        const ctx = await getAudioContext();
        notes.forEach((freq, i) => {
            try {
                const osc  = ctx.createOscillator();
                const gain = ctx.createGain();
                const t    = ctx.currentTime + i * 0.2;

                osc.connect(gain);
                gain.connect(ctx.destination);

                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, t);

                gain.gain.setValueAtTime(0, t);
                gain.gain.linearRampToValueAtTime(0.07, t + 0.01);
                gain.gain.setValueAtTime(0.07, t + 0.1);
                gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);

                osc.start(t);
                osc.stop(t + 0.56);
            } catch (_) {}
        });
    }

    // Ekspos ke seluruh scope
    window._playCheckSound   = playCheckSound;
    window._playUncheckSound = playUncheckSound;
    window._playTapSound     = playTapSound;
    window._playChimeSound   = playChimeSound;
    window._playPopSound     = playCheckSound; // alias kompatibilitas

    // ============================================================
    // --- 9. WEATHER WIDGET (Geolocation + Open-Meteo, no API key) ---
    // ============================================================
    const WEATHER_CODES = {
        0:  { icon: '☀️',  desc: 'Cerah' },
        1:  { icon: '🌤️', desc: 'Hampir Cerah' },
        2:  { icon: '⛅',  desc: 'Berawan Sebagian' },
        3:  { icon: '☁️',  desc: 'Mendung' },
        45: { icon: '🌫️', desc: 'Berkabut' },
        48: { icon: '🌫️', desc: 'Kabut Beku' },
        51: { icon: '🌦️', desc: 'Gerimis Ringan' },
        53: { icon: '🌦️', desc: 'Gerimis Sedang' },
        55: { icon: '🌧️', desc: 'Gerimis Lebat' },
        61: { icon: '🌧️', desc: 'Hujan Ringan' },
        63: { icon: '🌧️', desc: 'Hujan Sedang' },
        65: { icon: '🌧️', desc: 'Hujan Lebat' },
        71: { icon: '🌨️', desc: 'Salju Ringan' },
        80: { icon: '🌦️', desc: 'Hujan Sebentar' },
        95: { icon: '⛈️',  desc: 'Badai Petir' },
        99: { icon: '⛈️',  desc: 'Badai + Es' },
    };

    function setWeatherDisplay(icon, temp, desc) {
        document.getElementById('weather-icon').textContent = icon;
        document.getElementById('weather-temp').textContent = temp;
        document.getElementById('weather-desc').textContent = desc;
    }

    async function fetchWeather(lat, lon) {
        try {
            const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&temperature_unit=celsius`;
            const res = await fetch(url);
            if (!res.ok) throw new Error('Network error');
            const data = await res.json();
            const cw = data.current_weather;
            const wmo = WEATHER_CODES[cw.weathercode] || { icon: '🌡️', desc: 'Tidak Diketahui' };
            setWeatherDisplay(wmo.icon, `${Math.round(cw.temperature)}°C`, wmo.desc);
        } catch {
            setWeatherDisplay('🌡️', '--°C', 'Gagal memuat');
        }
    }

    function initWeather() {
        if (!navigator.geolocation) {
            setWeatherDisplay('📍', '--°C', 'Lokasi tidak tersedia');
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (pos) => fetchWeather(pos.coords.latitude, pos.coords.longitude),
            () => {
                // Jika akses lokasi ditolak, fallback ke Jakarta
                fetchWeather(-6.2088, 106.8456);
            },
            { timeout: 8000 }
        );
    }

    initWeather();

    // ============================================================
    // --- 10. QUICK NOTES / SCRATCHPAD ---
    // ============================================================
    const notesArea = document.getElementById('quick-notes');
    const notesSavedIndicator = document.getElementById('notes-saved-indicator');
    let notesSaveTimer = null;

    // Muat catatan tersimpan
    notesArea.value = localStorage.getItem('dashboard_notes') || '';

    notesArea.addEventListener('input', () => {
        // Debounce: simpan 800ms setelah pengguna berhenti mengetik
        clearTimeout(notesSaveTimer);
        notesSavedIndicator.textContent = 'Mengetik...';
        notesSaveTimer = setTimeout(() => {
            localStorage.setItem('dashboard_notes', notesArea.value);
            notesSavedIndicator.textContent = '✓ Tersimpan';
            // Sembunyikan indikator setelah 2 detik
            setTimeout(() => { notesSavedIndicator.textContent = ''; }, 2000);
        }, 800);
    });

    // --- 7. CURSOR PARTICLE EFFECT ---
    // Ambil warna accent dari CSS variable agar otomatis mengikuti dark/light mode
    function getAccentColor() {
        return getComputedStyle(document.documentElement)
            .getPropertyValue('--accent')
            .trim() || '#4F46E5';
    }

    // Setiap partikel punya state sendiri: posisi, kecepatan, ukuran, opacity, warna
    const particles = [];
    // Batasi jumlah partikel aktif sekaligus agar ringan
    const MAX_PARTICLES = 30;

    function spawnParticle(x, y) {
        if (particles.length >= MAX_PARTICLES) return;

        const size = Math.random() * 6 + 3; // 3–9px
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 1.5 + 0.5; // 0.5–2 px/frame

        const el = document.createElement('span');
        el.className = 'cursor-particle';
        el.style.cssText = `
            width: ${size}px;
            height: ${size}px;
            left: ${x - size / 2}px;
            top: ${y - size / 2}px;
            background-color: ${getAccentColor()};
            opacity: 0.85;
        `;
        document.body.appendChild(el);

        particles.push({
            el,
            x,
            y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 1.2, // Sedikit ke atas (efek menyebar naik)
            opacity: 0.85,
            decay: Math.random() * 0.025 + 0.018, // Kecepatan fade-out per frame
        });
    }

    function animateParticles() {
        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];

            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.05;          // Gravitasi ringan
            p.opacity -= p.decay;

            if (p.opacity <= 0) {
                // Partikel sudah tidak terlihat — hapus dari DOM dan array
                p.el.remove();
                particles.splice(i, 1);
            } else {
                p.el.style.left = `${p.x}px`;
                p.el.style.top = `${p.y}px`;
                p.el.style.opacity = p.opacity;
            }
        }

        requestAnimationFrame(animateParticles);
    }

    // Throttle event mousemove agar tidak spawn terlalu banyak partikel sekaligus
    let lastSpawn = 0;
    const SPAWN_INTERVAL_MS = 30; // Spawn partikel baru maks. setiap 30ms

    document.addEventListener('mousemove', (e) => {
        const now = Date.now();
        if (now - lastSpawn < SPAWN_INTERVAL_MS) return;
        lastSpawn = now;

        // Spawn 2–3 partikel per gerakan agar terlihat smooth
        const count = Math.floor(Math.random() * 2) + 2;
        for (let i = 0; i < count; i++) {
            spawnParticle(e.clientX, e.clientY);
        }
    });

    // Mulai loop animasi
    requestAnimationFrame(animateParticles);
});