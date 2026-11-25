/* Dimitris Pournatzis · the cyberdeck
   A rugged case that opens onto an Arch Linux (Hyprland) desktop. The CV sections are the apps;
   six keys, the waybar workspaces and 1 to 6 switch them; a foot terminal takes commands.
   All output is built with createElement + textContent (the page enforces Trusted Types). */
(function () {
  'use strict';

  var d = document;
  var root = d.documentElement;
  var gsap = window.gsap;
  var DP = window.DPCV || {};
  function $(s) { return d.querySelector(s); }
  function $$(s, el) { return Array.prototype.slice.call((el || d).querySelectorAll(s)); }
  function debounce(fn, ms) { var t = 0; return function () { clearTimeout(t); t = setTimeout(fn, ms); }; }

  var scene = $('#scene');
  if (!scene || !gsap) { root.classList.remove('deck-on'); return; }

  var mqReduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var mqNarrow = window.matchMedia('(max-width: 999.98px)');
  var mqPhone = window.matchMedia('(max-width: 699.98px)');
  var mqWall = window.matchMedia('(min-width: 900px) and (hover: hover) and (pointer: fine)');

  var deck = $('#deck'), kase = $('#case'), intro = $('#intro');
  var boot = $('#boot'), bootLog = $('#bootLog');
  var bar = $('#bar'), wm = $('#wm'), winApp = $('#winApp'), winTerm = $('#winTerm'), main = $('#main');
  var barTitle = $('#barTitle'), announce = $('#announce');
  var launcher = $('#launcher'), launchBtn = $('#launchBtn'), launchIn = $('#launchIn');
  var termBtn = $('#termBtn'), wallBtn = $('#wallBtn'), wallGL = $('#wallGL'), clock = $('#barClock');
  var eject = $('#eject'), cartChip = $('#cartChip');
  var latches = $$('.case__latch');
  var keyBtns = $$('.keys .key'), wsBtns = $$('.bar__ws button');
  var apps = $$('#main > .app').sort(function (a, b) { return +a.getAttribute('data-ws') - +b.getAttribute('data-ws'); });
  var NAMES = ['README', 'Experience', 'HomeLab', 'Skills', 'Education', 'Contact'];
  var BASE_TITLE = d.title;

  var state = 'closed';
  var ws = 1;
  var tl = null, bootTl = null;

  function isDeck() { return root.classList.contains('deck-on'); }
  function setState(s) { state = s; scene.setAttribute('data-state', s); }
  function sget(k) { try { return window.sessionStorage.getItem(k); } catch (e) { return null; } }
  function sset(k, v) { try { if (v === null) window.sessionStorage.removeItem(k); else window.sessionStorage.setItem(k, v); } catch (e) { /* blocked */ } }
  function lset(k, v) { try { window.localStorage.setItem(k, v); } catch (e) { /* blocked */ } }
  function say(msg) { announce.textContent = ''; setTimeout(function () { announce.textContent = msg; }, 40); }
  function killTimelines() {
    if (tl) { tl.kill(); tl = null; }
    if (bootTl) { bootTl.kill(); bootTl = null; }
  }

  /* ════════════════════════════ terminal (foot + zsh) ════════════════════════════ */
  var Term = (function () {
    var out = $('#termOut'), form = $('#termForm'), input = $('#termIn'), scroll = $('#termScroll'), pathEl = $('#termPath');
    var hist = [], hpos = 0, cwd = '~', sudoWarned = false, started = false;

    var LOGO = [
      '       /\\',
      '      /  \\',
      '     /\\   \\',
      '    /      \\',
      '   /   ,,   \\',
      '  /   |  |  -\\',
      " /_-''    ''-_\\"
    ].join('\n');
    var FETCH = [
      ['OS', 'Arch Linux x86_64'],
      ['Host', 'DP-01 field deck'],
      ['Kernel', '6.17.9-hardened1-1-hardened'],
      ['Uptime', 'since 2022 (AUEB)'],
      ['Packages', '812 (pacman), 12 (docker)'],
      ['Shell', 'zsh 5.9'],
      ['WM', 'Hyprland'],
      ['Terminal', 'foot'],
      ['Role', 'junior SOC · Blue Team · TI'],
      ['Location', 'Athens, GR']
    ];
    var DIRS = {
      '~': ['experience/', 'homelab/', 'skills/', 'education/', 'contact/', 'README.md', 'cv.pdf'],
      '~/experience': ['alpha-bank.md', 'zippo-hellas.md', 'house-of-david.md'],
      '~/homelab': ['README.md'],
      '~/skills': ['skills.txt'],
      '~/education': ['aueb.md', 'certifications.md'],
      '~/contact': ['contact.txt']
    };
    var HIDDEN = { '~': ['.flag', '.zshrc'] };
    var FILES = {
      '~/README.md': ['# Dimitris Pournatzis', 'Computer Science student (cybersecurity path) at AUEB, Athens.', 'Resilience and Intelligence Intern at Alpha Bank, Mar to May 2026.', 'Looking for a junior SOC, Blue Team or threat intelligence role.', ['Try: cd experience, ls, cat alpha-bank.md', 'dim']],
      '~/.flag': [['DP{y0u_r34d_th3_d0tf1l3s}', 'ok'], ['Nice. Mention it when you email me.', 'dim']],
      '~/.zshrc': ['export EDITOR=nvim', "alias ls='ls --color=auto'", "alias please='sudo'", "alias update='sudo pacman -Syu'", '# I use Arch, btw'],
      '~/experience/alpha-bank.md': ['## Resilience and Intelligence Intern · Alpha Bank', 'Mar – May 2026', '- Monitored security logs and supported alert triage in Microsoft Sentinel.', '- Supported phishing simulation setup, execution and security-awareness metrics.', '- Observed threat intelligence workflows, including IOC analysis and threat reporting.', '- Shadowed web application penetration tests and their vulnerability reporting.'],
      '~/experience/zippo-hellas.md': ['## IT Intern · Zippo Hellas, Dritsas Group', 'Jun – Sep 2023', '- Helped maintain the e-commerce site, fixed technical problems and kept the stock and pricing records in Excel.'],
      '~/experience/house-of-david.md': ['## Prop Construction Assistant · House of David', 'Jun – Aug 2024', '- Built stage props and solved fabrication problems as part of a team.'],
      '~/homelab/README.md': ['## HomeLab: private security infrastructure', 'Raspberry Pi 5 · 12 services · Docker Compose', '- No public inbound ports: Tailscale (WireGuard), HTTPS through Tailscale Serve.', '- Isolated Docker networks, UFW subnet allowlists, fewer capabilities, non-root where supported.', '- Prometheus, Grafana, Loki/Promtail and Alertmanager for metrics, logs and alerts.', '- Controls tested with Nmap, Hydra and Wireshark; incidents written up.', ['https://dimpourn.github.io/sh_lab/', 'blue']],
      '~/skills/skills.txt': ['security operations   Microsoft Sentinel, log monitoring, alert triage, phishing simulations', 'threat intelligence   IOC analysis workflows, threat reporting', 'host and network      Linux, UFW, CrowdSec, Fail2ban, Tailscale (WireGuard), TLS, Pi-hole, Unbound', 'monitoring            Prometheus, Grafana, Loki, Promtail, Alertmanager', 'security testing      Nmap, Wireshark, Hydra, Kali Linux', 'infrastructure        Docker Compose, bridge networks, least privilege, Git, off-site backups'],
      '~/education/aueb.md': ['## B.Sc. Computer Science, cybersecurity path', 'Athens University of Economics and Business · 2022 – expected 2027'],
      '~/education/certifications.md': ['- OffSec: Threat Hunting Foundations badge', '- OffSec: Security Essentials (SEC100), learning path completed', '- OffSec: Foundational Threat Hunting (TH-200), learning path completed', '- Cadmus: Cyber Regulatory Compliance & Policy Management', '- English: Cambridge English C2 Proficiency (CPE) · Japanese: JLPT N5', '- ISC2 Student Member · 16th Infocom Security Conference'],
      '~/contact/contact.txt': ['email     dvpournatzis@proton.me', 'github    github.com/DimPourn', 'linkedin  linkedin.com/in/dimpournatzis', ['Type email to write to me, or cv for the PDF.', 'dim']]
    };
    var APPS = { readme: 1, experience: 2, homelab: 3, skills: 4, education: 5, contact: 6 };
    var CMDS = ['help', 'ls', 'cd', 'cat', 'open', 'clear', 'whoami', 'fastfetch', 'neofetch', 'man', 'systemctl', 'journalctl',
      'uname', 'pacman', 'yay', 'sudo', 'nmap', 'ssh', 'ping', 'vim', 'nano', 'emacs', 'history', 'date', 'uptime', 'id', 'pwd',
      'echo', 'reboot', 'poweroff', 'plain', 'cv', 'email', 'exit', 'readme', 'experience', 'homelab', 'skills', 'education', 'contact'];
    var HELP = [
      ['apps      readme  experience  homelab  skills  education  contact', 'blue'],
      'files     ls  cd <dir>  cat <file>  pwd',
      'cv        cv (download the PDF)  email  plain (plain view)',
      'system    whoami  fastfetch  man dimitris  systemctl status dimitris',
      ['Keys 1 to 6 and the bar at the top switch apps too. Tab completes, arrows recall.', 'dim']
    ];
    var OSREL = ['NAME="Arch Linux"', 'PRETTY_NAME="Arch Linux"', 'ID=arch', 'BUILD_ID=rolling', 'ANSI_COLOR="38;2;23;147;209"', 'HOME_URL="https://archlinux.org/"', 'LOGO=archlinux-logo'];
    var SL = [
      '      ====        ________                ___________',
      '  _D _|  |_______/        \\__I_I_____===__|_________|',
      '   |(_)---  |   H\\________/ |   |        =|___ ___|',
      '   /     |  |   H  |  |     |   |         ||_| |_||',
      '  |      |  |   H  |__--------------------| [___] |',
      '  | ________|___H__/__|_____/[][]~\\_______|       |',
      '  |/ |   |-----------I_____I [][] []  D   |=======|__',
      '__/ =| o |=-~~\\  /~~\\  /~~\\  /~~\\ ____Y___________|__',
      ' |/-=|___|=    ||    ||    ||    |_____/~\\___/',
      '  \\_/      \\O=====O=====O=====O_/      \\_/'
    ].join('\n');

    function span(t, c) { var s = d.createElement('span'); s.className = c; s.textContent = t; return s; }
    function add(text, cls) {
      var el = d.createElement('div');
      if (cls) el.className = 't-' + cls;
      el.textContent = text;
      out.appendChild(el);
    }
    function scrollEnd() { scroll.scrollTop = scroll.scrollHeight; }
    function print(lines) {
      lines.forEach(function (l) {
        if (typeof l === 'string') add(l);
        else if (l && l.nodeType) out.appendChild(l);
        else if (l) add(l[0], l[1]);
      });
      while (out.childNodes.length > 500) out.removeChild(out.firstChild);
      scrollEnd();
    }
    function echo(cmd) {
      var el = d.createElement('div');
      el.className = 't-cmd';
      el.appendChild(span('dimitris@dp-deck', 't-user'));
      el.appendChild(d.createTextNode(':'));
      el.appendChild(span(cwd, 't-path'));
      el.appendChild(d.createTextNode('$ ' + cmd));
      out.appendChild(el);
    }
    function fetchBlock() {
      var wrap = d.createElement('div');
      wrap.className = 'fetch';
      var logo = d.createElement('pre');
      logo.className = 'fetch__logo';
      logo.textContent = LOGO;
      wrap.appendChild(logo);
      var info = d.createElement('div');
      info.className = 'fetch__info';
      var head = d.createElement('div');
      head.appendChild(span('dimitris', 'fetch__k'));
      head.appendChild(d.createTextNode('@'));
      head.appendChild(span('dp-deck', 'fetch__k'));
      info.appendChild(head);
      var sep = d.createElement('div');
      sep.className = 't-dim';
      sep.textContent = '----------------';
      info.appendChild(sep);
      FETCH.forEach(function (r) {
        var row = d.createElement('div');
        row.appendChild(span(r[0], 'fetch__k'));
        row.appendChild(d.createTextNode(': ' + r[1]));
        info.appendChild(row);
      });
      var sw = d.createElement('div');
      sw.className = 'fetch__sw';
      sw.setAttribute('aria-hidden', 'true');
      for (var i = 0; i < 8; i++) sw.appendChild(d.createElement('span'));
      info.appendChild(sw);
      wrap.appendChild(info);
      return wrap;
    }
    function setCwd(c) {
      cwd = c;
      pathEl.textContent = c;
      if (winTerm.classList.contains('is-focused')) barTitle.textContent = 'foot: dimitris@dp-deck:' + c;
    }
    function resolve(p) {
      if (!p) return cwd;
      if (p === '~' || p === '/home/dimitris' || p === '/home/dimitris/') return '~';
      var t = p.replace(/\/+$/, '');
      if (t.indexOf('~/') === 0) return t;
      if (t.indexOf('/home/dimitris/') === 0) return '~/' + t.slice(15);
      if (t === '..') return cwd === '~' ? '/home' : '~';
      return cwd + '/' + t;
    }
    function openApp(name) {
      setWS(APPS[name]);
      return [['opened ~/cv/' + apps[APPS[name] - 1].getAttribute('data-title'), 'dim']];
    }
    function cd(p) {
      var to = resolve(p);
      if (to === '~') { setCwd('~'); return null; }
      if (to === '/home') return [['cd: permission denied: /home (this CV lives in ~)', 'err']];
      if (DIRS[to]) {
        setCwd(to);
        var name = to.slice(2);
        if (APPS[name]) {
          setWS(APPS[name]);
          if (mqNarrow.matches) showTerm(true);
        }
        return null;
      }
      if (p === '/' || (p && p.charAt(0) === '/')) return [['cd: permission denied: ' + p, 'err']];
      return [['cd: no such file or directory: ' + p, 'err']];
    }
    function ls(args) {
      var all = args.some(function (x) { return /^-[a-z]*a/.test(x); });
      var long = args.some(function (x) { return /^-[a-z]*l/.test(x); });
      var target = args.filter(function (x) { return x.charAt(0) !== '-'; })[0];
      var dir = target ? resolve(target) : cwd;
      if (!DIRS[dir]) return [["ls: cannot access '" + target + "': No such file or directory", 'err']];
      var items = DIRS[dir].slice();
      if (all) items = (HIDDEN[dir] || []).concat(items);
      if (long) {
        return items.map(function (i) {
          if (i.slice(-1) === '/') return 'drwxr-xr-x 2 dimitris dimitris 4096 Nov 25 ' + i;
          if (i === '.flag') return '-r-------- 1 dimitris dimitris   33 Nov 25 .flag';
          if (i === 'cv.pdf') return '-rw-r--r-- 1 dimitris dimitris  59K Nov 25 cv.pdf';
          return '-rw-r--r-- 1 dimitris dimitris  412 Nov 25 ' + i;
        });
      }
      return [[(all ? '.  ..  ' : '') + items.join('  '), 'blue']];
    }
    function cat(p) {
      if (!p) return [['cat: missing operand', 'err']];
      if (p === '/etc/os-release' || p === '/usr/lib/os-release') return OSREL.slice();
      if (p === '/etc/passwd') return ['root:x:0:0::/root:/usr/bin/bash', 'dimitris:x:1000:1000:Dimitris Pournatzis:/home/dimitris:/usr/bin/zsh'];
      if (p === '/etc/shadow' || p === '/etc/sudoers' || p === '/root/.ssh/id_ed25519') return [['cat: ' + p + ': Permission denied', 'err']];
      if (p === '/etc/hostname') return ['dp-deck'];
      var key = resolve(p);
      if (FILES[key]) return FILES[key].slice();
      if (key === '~/cv.pdf') return [['cat: cv.pdf: binary file. Try: cv', 'err']];
      if (DIRS[key]) return [['cat: ' + p + ': Is a directory', 'err']];
      return [['cat: ' + p + ': No such file or directory', 'err']];
    }
    function sudo() {
      var r = [];
      if (!sudoWarned) {
        sudoWarned = true;
        r = ['', 'We trust you have received the usual lecture from the local System', 'Administrator. It usually boils down to these three things:', '',
          '    #1) Respect the privacy of others.', '    #2) Think before you type.', '    #3) With great power comes great responsibility.', ''];
      }
      return r.concat(['[sudo] password for dimitris:', ['dimitris is not in the sudoers file.', 'err']]);
    }
    function pacman(a) {
      var op = a[1] || '';
      if (/^-Q[a-z]*i$/.test(op) || /^-S[a-z]*i$/.test(op)) {
        if ((a[2] || '').toLowerCase() === 'dimitris') {
          return ['Name            : dimitris', 'Version         : 2026.11-1', 'Description     : Junior SOC, Blue Team and threat intelligence analyst',
            'Architecture    : x86_64', 'URL             : https://dimpourn.github.io/DimPournCV/', 'Licenses        : custom (hire me)',
            'Depends On      : coffee  curiosity  linux-hardened', 'Optional Deps   : your-soc-team: somewhere to put all this to work',
            'Install Reason  : Explicitly installed'];
        }
        return [["error: package '" + (a[2] || '') + "' was not found", 'err']];
      }
      if (op === '-Q') return ['dimitris 2026.11-1', 'hyprland', 'foot', 'linux-hardened', 'tailscale', 'zsh', ['(and 806 more)', 'dim']];
      return [['error: you cannot perform this operation unless you are root.', 'err']];
    }
    function rm(low) {
      if (/(^|\s)\/(\s|$)/.test(low) && low.indexOf('--no-preserve-root') !== -1) return [['Nice try. The root filesystem here is read-only.', 'dim']];
      if (/(^|\s)\/(\s|$)/.test(low) || /(^|\s)\/\*(\s|$)/.test(low)) return [["rm: it is dangerous to operate recursively on '/'", 'err'], ['rm: use --no-preserve-root to override this failsafe', 'err']];
      return [['rm: cannot remove: Read-only file system', 'err']];
    }
    function nmap(a) {
      var host = a.slice(1).filter(function (x) { return x.charAt(0) !== '-'; }).pop() || 'dp-deck';
      return ['Starting Nmap 7.95 ( https://nmap.org )', 'Nmap scan report for ' + host + ' (127.0.0.1)', 'Host is up (0.00011s latency).',
        'All 1000 scanned ports on ' + host + ' are in ignored states.', 'Not shown: 1000 filtered tcp ports (no-response)',
        ['Nmap done: 1 IP address (1 host up) scanned in 21.07 seconds', 'dim']];
    }
    function man(page) {
      if (!page) return ['What manual page do you want?', "For example, try 'man man'."];
      if (page.toLowerCase() !== 'dimitris') return ['No manual entry for ' + page];
      return [['DIMITRIS(1)                 User Commands                 DIMITRIS(1)', 'blue'], '', 'NAME',
        '       dimitris - junior SOC analyst, Blue Team and threat intelligence candidate', '', 'SYNOPSIS',
        '       dimitris [--soc] [--blue-team] [--threat-intel] [--athens]', '', 'DESCRIPTION',
        '       Monitors logs, triages alerts, builds and hardens infrastructure,', '       and writes up what broke and why.', '',
        'OPTIONS', '       --soc          log monitoring and alert triage (Microsoft Sentinel)', '       --threat-intel IOC analysis and threat reporting',
        '       --blue-team    hardening, monitoring and testing the controls', '', 'BUGS',
        '       Documents incidents in more detail than strictly necessary.', '', 'SEE ALSO', '       sh_lab(7), cv.pdf(5)'];
    }
    function systemctl(a) {
      var verb = a[1] || '', unit = (a[2] || '').replace(/\.service$/, '');
      if (verb === 'status' && unit === 'dimitris') {
        return [['● dimitris.service - Junior SOC analyst (looking for work)', 'ok'],
          '     Loaded: loaded (/etc/systemd/system/dimitris.service; enabled; preset: disabled)',
          ['     Active: active (running) since 2022 (AUEB)', 'ok'], '       Docs: man:dimitris(1)',
          '   Main PID: 2026 (alpha-bank-intern)', '      Tasks: 3 (limit: SOC, Blue Team, threat intel)',
          '     CGroup: /system.slice/dimitris.service', '             └─2026 /usr/bin/dimitris --soc --blue-team --threat-intel', '',
          'Nov 25 dp-deck dimitris[2026]: ready for interviews'];
      }
      if (/^(start|stop|restart|enable|disable)$/.test(verb)) return ['==== AUTHENTICATING FOR org.freedesktop.systemd1.manage-units ====', ['Authentication is required to manage system services. Email me instead.', 'dim']];
      if (verb === 'status' && unit) return ['Unit ' + unit + '.service could not be found.'];
      return [['Try: systemctl status dimitris', 'dim']];
    }
    function journal(a) {
      var u = a.indexOf('-u') !== -1 ? (a[a.indexOf('-u') + 1] || '') : '';
      if (u.indexOf('alpha') === 0) {
        return [['-- Logs begin at Mar 2026 --', 'dim'], 'Mar 2026 dp-deck alpha-bank[2026]: Started Resilience and Intelligence internship.',
          'Mar 2026 dp-deck sentinel[2026]: log monitoring and alert triage in Microsoft Sentinel',
          'Apr 2026 dp-deck phishing-sim[2026]: simulation set up, run, awareness metrics reported',
          'Apr 2026 dp-deck cti[2026]: observed IOC analysis and threat reporting',
          'May 2026 dp-deck appsec[2026]: shadowed web application penetration tests',
          ['May 2026 dp-deck alpha-bank[2026]: Finished internship. Result: completed.', 'ok']];
      }
      return [['Try: journalctl -u alpha-bank', 'dim']];
    }
    function history() {
      var base = ['docker compose up -d', 'tailscale serve status', 'nmap -sV --top-ports 100 pi5', 'journalctl -u alertmanager -f', 'sudo pacman -Syu'];
      return base.concat(hist).map(function (c, i) { return ('    ' + (i + 1)).slice(-5) + '  ' + c; });
    }
    function echoArgs(s) {
      var env = { SHELL: '/usr/bin/zsh', USER: 'dimitris', HOME: '/home/dimitris', EDITOR: 'nvim', XDG_CURRENT_DESKTOP: 'Hyprland', HOSTNAME: 'dp-deck' };
      return s.replace(/^["']|["']$/g, '').replace(/\$\{?([A-Z_]+)\}?/g, function (m, k) { return env[k] !== undefined ? env[k] : ''; });
    }
    function sl() {
      var pre = d.createElement('pre');
      pre.className = 'sl-train';
      pre.textContent = SL;
      return pre;
    }
    function cv() {
      eject.click();
      return [['Downloading Dimitris-Pournatzis-CV.pdf ...', 'ok']];
    }

    function exec(cmd, a) {
      var name = a[0].toLowerCase(), low = cmd.toLowerCase(), arg = a.slice(1).join(' ');
      if (name === 'clear') { out.textContent = ''; return null; }
      if (name === 'help' || name === '?') return HELP;
      if (APPS[name] && a.length === 1) return openApp(name);
      if (name === 'open' || name === 'xdg-open') {
        var t = (a[1] || '').replace(/\/$/, '').toLowerCase();
        if (APPS[t]) return openApp(t);
        if (t === 'cv' || t === 'cv.pdf') return cv();
        return [['open: ' + (a[1] || '') + ': no such app. Try: open homelab', 'err']];
      }
      if (name === 'cd') return cd(a[1]);
      if (name === 'ls' || name === 'll' || name === 'la') return ls(name === 'll' ? ['-l'].concat(a.slice(1)) : name === 'la' ? ['-a'].concat(a.slice(1)) : a.slice(1));
      if (name === 'cat' || name === 'bat' || name === 'less' || name === 'more') return cat(a[1]);
      if (name === 'pwd') return [cwd.replace(/^~/, '/home/dimitris')];
      if (name === 'whoami') return ['dimitris'];
      if (name === 'hostname') return ['dp-deck'];
      if (name === 'id') return ['uid=1000(dimitris) gid=1000(dimitris) groups=1000(dimitris)'];
      if (name === 'fastfetch') return [fetchBlock()];
      if (name === 'neofetch') return [['neofetch is archived upstream; running fastfetch instead.', 'dim'], fetchBlock()];
      if (name === 'uname') return [a[1] === '-a' ? 'Linux dp-deck 6.17.9-hardened1-1-hardened #1 SMP PREEMPT_DYNAMIC x86_64 GNU/Linux' : a[1] === '-r' ? '6.17.9-hardened1-1-hardened' : 'Linux'];
      if (name === 'sudo' || name === 'please' || name === 'doas' || name === 'update') return sudo();
      if (name === 'su') return [['su: Authentication failure', 'err']];
      if (name === 'pacman') return pacman(a);
      if (name === 'yay' || name === 'paru') return [':: Searching AUR for updates...', ' there is nothing to do'];
      if (name === 'rm') return rm(low);
      if (name === 'nmap') return nmap(a);
      if (name === 'ssh') return [['ssh: connect to host ' + (a[1] || 'dp-deck') + ' port 22: Connection refused', 'err'], ['(tailnet only)', 'dim']];
      if (name === 'ping') return ['PING ' + (a[1] || 'dp-deck') + ' 56(84) bytes of data.', ['^C (ICMP is dropped here too)', 'dim']];
      if (name === 'man') return man(a[1]);
      if (name === 'systemctl') return systemctl(a);
      if (name === 'journalctl') return journal(a);
      if (name === 'history') return history();
      if (name === 'date') return [new Date().toString().replace(/ \(.*\)$/, '')];
      if (name === 'uptime') return [' ' + new Date().toTimeString().slice(0, 8) + ' up since 2022 (AUEB),  1 user,  load average: 0.42, 0.37, 0.31'];
      if (name === 'echo') return [echoArgs(arg)];
      if (name === 'btw' || low === 'arch' || low === 'i use arch' || low === 'i use arch btw') return [['I use Arch, btw.', 'blue']];
      if (name === 'vim' || name === 'vi' || name === 'nvim') return ['~', '~                 VIM - Vi IMproved', '~        type :q to quit (yes, here it works)', '~'];
      if (/^:(q|q!|wq|wq!|x)$/.test(low)) return [['You left vim on the first try. Respect.', 'ok']];
      if (name === 'nano') return [['nano: a fine choice. Ctrl+X leaves.', 'dim']];
      if (name === 'emacs') return [['emacs: a great operating system, lacking only a decent editor.', 'dim']];
      if (name === 'sl') return [sl(), ['(you meant ls)', 'dim']];
      if (name === 'exit' || name === 'logout') return ['logout', ['You cannot log out of a CV. Press 6 to get in touch instead.', 'dim']];
      if (name === 'reboot') { setTimeout(reboot, 700); return [['Broadcast message from root@dp-deck: the system will reboot now!', 'blue']]; }
      if (name === 'poweroff' || name === 'shutdown' || name === 'halt') { setTimeout(closeLid, 700); return [['Powering off. The lid closes.', 'dim']]; }
      if (name === 'cv' || name === 'download') return cv();
      if (name === 'email' || name === 'mail') { window.location.href = 'mailto:dvpournatzis@proton.me'; return [['Opening your mail app: dvpournatzis@proton.me', 'ok']]; }
      if (name === 'plain') { setTimeout(function () { setMode('plain'); }, 400); return [['Switching to the plain view.', 'dim']]; }
      return [['zsh: command not found: ' + a[0], 'err']];
    }
    function run(raw) {
      var cmd = String(raw || '').replace(/\s+/g, ' ').trim();
      echo(cmd);
      if (!cmd) { scrollEnd(); return; }
      var r = exec(cmd, cmd.split(' '));
      if (r) print(r); else scrollEnd();
    }
    function complete() {
      var v = input.value;
      var parts = v.split(' ');
      var last = parts[parts.length - 1];
      var pool = parts.length === 1 ? CMDS : (DIRS[cwd] || []).concat(HIDDEN[cwd] || []);
      var m = pool.filter(function (x) { return x.indexOf(last) === 0; });
      if (m.length === 1) {
        parts[parts.length - 1] = m[0];
        input.value = parts.join(' ') + (m[0].slice(-1) === '/' ? '' : ' ');
      } else if (m.length > 1) {
        echo(v);
        print([[m.join('  '), 'blue']]);
      }
    }
    function remember(v) { if (v.trim()) hist.push(v.trim()); hpos = hist.length; }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var v = input.value;
      input.value = '';
      remember(v);
      run(v);
    });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (hist.length) { hpos = Math.max(0, hpos - 1); input.value = hist[hpos]; }
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        hpos = Math.min(hist.length, hpos + 1);
        input.value = hist[hpos] || '';
      } else if (e.key === 'Tab' && input.value && !e.shiftKey) {
        e.preventDefault();
        complete();
      } else if (e.ctrlKey && (e.key === 'l' || e.key === 'L')) {
        e.preventDefault();
        out.textContent = '';
      } else if (e.ctrlKey && (e.key === 'c' || e.key === 'C') && input.selectionStart === input.selectionEnd) {
        e.preventDefault();
        echo(input.value + '^C');
        input.value = '';
        scrollEnd();
      }
    });
    $$('.term__hints button').forEach(function (b) {
      b.addEventListener('click', function () {
        var c = b.getAttribute('data-cmd');
        remember(c);
        run(c);
        if (!mqPhone.matches) input.focus({ preventScroll: true });
      });
    });
    scroll.addEventListener('click', function () {
      if (!mqPhone.matches && !String(window.getSelection())) input.focus({ preventScroll: true });
    });

    return {
      start: function () {
        if (started) return;
        started = true;
        echo('fastfetch');
        print([fetchBlock(), ['Type help, or press 1 to 6 for the apps.', 'dim']]);
      },
      print: print,
      focus: function () { input.focus({ preventScroll: true }); },
      scrollEnd: scrollEnd,
      cwd: function () { return cwd; }
    };
  })();

  /* ════════════════════════════ windows, workspaces ════════════════════════════ */
  function focusWin(w) {
    winApp.classList.toggle('is-focused', w === winApp);
    winTerm.classList.toggle('is-focused', w === winTerm);
    barTitle.textContent = w === winTerm ? 'foot: dimitris@dp-deck:' + Term.cwd() : '~/cv/' + apps[ws - 1].getAttribute('data-title');
  }
  function showTerm(on) {
    wm.classList.toggle('show-term', !!on);
    termBtn.setAttribute('aria-pressed', String(!!on && mqNarrow.matches));
    focusWin(on ? winTerm : winApp);
    if (on) Term.scrollEnd();
  }
  function setWS(n, opt) {
    opt = opt || {};
    n = Math.max(1, Math.min(6, n | 0));
    var prev = ws;
    ws = n;
    var el = apps[n - 1];
    apps.forEach(function (a, i) { a.classList.toggle('is-active', i === n - 1); });
    keyBtns.concat(wsBtns).forEach(function (b) { b.setAttribute('aria-pressed', String(+b.getAttribute('data-ws') === n)); });
    if (mqNarrow.matches) showTerm(false); else focusWin(winApp);
    main.scrollTop = 0;
    if (!opt.instant && !mqReduce.matches && prev !== n && state === 'open') {
      gsap.fromTo(el, { x: n > prev ? 26 : -26, autoAlpha: 0 }, { x: 0, autoAlpha: 1, duration: 0.3, ease: 'power3.out', clearProps: 'transform,opacity,visibility' });
    }
    var title = el.getAttribute('data-title');
    d.title = 'dimitris@dp-deck: ~/cv/' + title;
    var hash = n === 1 ? '' : '#' + el.id;
    if (window.location.hash !== hash) window.history.replaceState(null, '', window.location.pathname + window.location.search + hash);
    if (!opt.silent) say(NAMES[n - 1] + ' opened');
    if (DP.lab) { if (n === 3) DP.lab.deckOn(); else DP.lab.deckOff(); }
  }
  function wsFromHash() {
    var id = window.location.hash.slice(1);
    if (!id) return 0;
    for (var i = 0; i < apps.length; i++) if (apps[i].id === id) return i + 1;
    return 0;
  }

  /* ════════════════════════════ the case: closed, opening, boot ════════════════════════════ */
  function closedTransform() {
    gsap.set(deck, { clearProps: 'transform' });
    var r = deck.getBoundingClientRect();
    var vw = window.innerWidth, vh = window.innerHeight;
    var phone = mqPhone.matches;
    var introTop = intro.getBoundingClientRect().top;
    var top = phone ? 46 : 64;
    var bottom = introTop - (phone ? 30 : 44);
    var s = Math.min((vw * (phone ? 0.72 : 0.6)) / r.width, Math.max(60, bottom - top) / r.height, 0.75);
    return { x: vw / 2 - (r.left + r.width / 2), y: (top + bottom) / 2 - (r.top + r.height / 2), scale: s };
  }
  function fit() {
    gsap.set(deck, closedTransform());
    scene.classList.add('is-fit');
  }
  function toClosed() {
    killTimelines();
    stopWall();
    closeLauncher(false);
    if (DP.lab) DP.lab.deckOff();
    setState('closed');
    gsap.set(kase, { autoAlpha: 1, rotationX: 0 });
    gsap.set(latches, { clearProps: 'transform' });
    gsap.set(intro, { autoAlpha: 1, y: 0 });
    gsap.set([bar, wm, boot], { clearProps: 'opacity,visibility,transform' });
    fit();
    d.title = BASE_TITLE;
    if (window.location.hash) window.history.replaceState(null, '', window.location.pathname + window.location.search);
  }
  function open() {
    if (state !== 'closed') return;
    if (mqReduce.matches) { showOpen(ws); return; }
    setState('opening');
    var t = gsap.timeline({ onComplete: startBoot });
    t.to(intro, { autoAlpha: 0, y: 12, duration: 0.3, ease: 'power2.in' }, 0)
      .to(latches, { rotationX: -70, transformPerspective: 400, transformOrigin: '50% 0%', duration: 0.22, ease: 'power2.out', stagger: 0.06 }, 0)
      .to(kase, { rotationX: 100, transformPerspective: 5200, transformOrigin: '50% 0%', duration: 0.72, ease: 'power2.in' }, 0.24)
      .to(kase, { autoAlpha: 0, duration: 0.14, ease: 'none' }, 0.82)
      .to(deck, { x: 0, y: 0, scale: 1, duration: 0.9, ease: 'power3.inOut' }, 0.64);
    tl = t;
  }

  var BOOT = [
    [':: running early hook [udev]'],
    [':: running hook [encrypt]'],
    [':: unlocking cryptroot with TPM2 ... done'],
    [":: mounting '/dev/mapper/cryptroot' on real root"],
    [],
    ['Welcome to ', ['Arch Linux', 'b-blue'], '!'],
    [],
    [['[  OK  ]', 'b-ok'], ' Reached target Local File Systems.'],
    [['[  OK  ]', 'b-ok'], ' Started Network Time Synchronization.'],
    [['[  OK  ]', 'b-ok'], ' Started Tailscale node agent.'],
    [['[  OK  ]', 'b-ok'], ' Started Docker Application Container Engine.'],
    [['[  OK  ]', 'b-ok'], ' Started Prometheus Monitoring System.'],
    [['[  OK  ]', 'b-ok'], ' Reached target Graphical Interface.'],
    [],
    ['Arch Linux 6.17.9-hardened1-1-hardened (tty1)'],
    []
  ];
  function bootLine(parts) {
    var el = d.createElement('div');
    parts.forEach(function (p) {
      if (typeof p === 'string') el.appendChild(d.createTextNode(p));
      else { var s = d.createElement('span'); s.className = p[1]; s.textContent = p[0]; el.appendChild(s); }
    });
    bootLog.appendChild(el);
    return el;
  }
  function lastLogin() {
    var t = new Date(Date.now() - 86400000);
    var D = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    var M = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return D[t.getDay()] + ' ' + M[t.getMonth()] + ' ' + t.getDate() + ' 23:41';
  }
  function startBoot() {
    tl = null;
    setState('booting');
    bootLog.textContent = '';
    gsap.set(boot, { autoAlpha: 1 });
    var t = gsap.timeline({ onComplete: function () { finishBoot(false); } });
    var at = 0.12;
    BOOT.forEach(function (parts) { t.call(bootLine, [parts], at); at += 0.05; });
    at += 0.1;
    var login = null;
    t.call(function () { login = bootLine(['dp-deck login: ']); }, null, at);
    'dimitris'.split('').forEach(function (ch, i) {
      t.call(function () { if (login) login.appendChild(d.createTextNode(ch)); }, null, at + 0.06 + i * 0.04);
    });
    at += 0.06 + 8 * 0.04 + 0.1;
    t.call(bootLine, [['Password:']], at);
    at += 0.2;
    t.call(bootLine, [['Last login: ' + lastLogin() + ' on tty1']], at);
    at += 0.08;
    t.call(function () {
      var l = bootLine(['[dimitris@dp-deck ~]$ exec Hyprland ']);
      var c = d.createElement('span');
      c.className = 'b-caret';
      l.appendChild(c);
    }, null, at);
    at += 0.32;
    t.to(boot, { autoAlpha: 0, duration: 0.22, ease: 'none' }, at);
    bootTl = t;
  }
  function finishBoot(instant) {
    if (bootTl) { bootTl.kill(); bootTl = null; }
    gsap.set(boot, { autoAlpha: 0 });
    showDesktop(instant);
  }
  function skip() {
    if (state === 'opening') {
      killTimelines();
      gsap.set(kase, { autoAlpha: 0 });
      gsap.set(intro, { autoAlpha: 0 });
      gsap.set(deck, { clearProps: 'transform' });
      finishBoot(true);
    } else if (state === 'booting') {
      finishBoot(true);
    }
  }
  function showDesktop(instant, n) {
    setState('open');
    sset('dpcv-open', '1');
    if (n) ws = n;
    setWS(ws, { instant: true, silent: true });
    if (!instant && !mqReduce.matches) {
      gsap.fromTo(bar, { y: -14, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.4, ease: 'power3.out', clearProps: 'transform,opacity,visibility' });
      var wins = [winApp, winTerm].filter(function (w) { return w.offsetWidth > 0; });
      gsap.fromTo(wins, { scale: 0.9, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 0.42, ease: 'power3.out', stagger: 0.08, delay: 0.06, clearProps: 'transform,opacity,visibility' });
    }
    Term.start();
    tickClock();
    startWall();
    try { main.focus({ preventScroll: true }); } catch (e) { /* old browser */ }
    say('Desktop ready, ' + NAMES[ws - 1] + ' is open. Keys 1 to 6 switch apps.');
  }
  function showOpen(n) {
    killTimelines();
    gsap.set(kase, { autoAlpha: 0 });
    gsap.set(intro, { autoAlpha: 0 });
    gsap.set(deck, { clearProps: 'transform' });
    gsap.set(boot, { autoAlpha: 0 });
    scene.classList.add('is-fit');
    showDesktop(true, n);
  }
  function reboot() {
    if (state !== 'open') return;
    closeLauncher(false);
    stopWall();
    if (mqReduce.matches) return;
    startBoot();
  }
  function closeLid() {
    if (state !== 'open') return;
    closeLauncher(false);
    stopWall();
    if (DP.lab) DP.lab.deckOff();
    sset('dpcv-open', null);
    if (mqReduce.matches) { toClosed(); $('#openDeck').focus(); say('Lid closed.'); return; }
    setState('closing');
    var target = closedTransform();
    var t = gsap.timeline({ onComplete: function () { toClosed(); $('#openDeck').focus({ preventScroll: true }); } });
    t.to([bar, wm], { autoAlpha: 0, duration: 0.2, ease: 'none' }, 0)
      .to(deck, { x: target.x, y: target.y, scale: target.scale, duration: 0.75, ease: 'power3.inOut' }, 0.08)
      .set(kase, { autoAlpha: 1, rotationX: 100, transformPerspective: 5200, transformOrigin: '50% 0%' }, 0.52)
      .to(kase, { rotationX: 0, duration: 0.6, ease: 'power2.out' }, 0.52)
      .to(latches, { rotationX: 0, duration: 0.2, ease: 'power2.out' }, 1.08)
      .to(intro, { autoAlpha: 1, y: 0, duration: 0.3, ease: 'power2.out' }, 1.0);
    tl = t;
    say('Lid closed.');
  }

  /* ════════════════════════════ launcher (wofi) ════════════════════════════ */
  var launchItems = $$('#launchList li');
  function filterLauncher(q) {
    q = q.trim().toLowerCase();
    launchItems.forEach(function (li) { li.hidden = q !== '' && li.textContent.toLowerCase().indexOf(q) === -1; });
  }
  function visibleLaunch() { return launchItems.filter(function (li) { return !li.hidden; }).map(function (li) { return li.querySelector('button'); }); }
  function openLauncher() {
    launcher.hidden = false;
    launchBtn.setAttribute('aria-expanded', 'true');
    launchIn.value = '';
    filterLauncher('');
    launchIn.focus({ preventScroll: true });
  }
  function closeLauncher(restore) {
    if (launcher.hidden) return;
    launcher.hidden = true;
    launchBtn.setAttribute('aria-expanded', 'false');
    if (restore) launchBtn.focus({ preventScroll: true });
  }
  launchBtn.addEventListener('click', function () { if (launcher.hidden) openLauncher(); else closeLauncher(true); });
  launchIn.addEventListener('input', function () { filterLauncher(launchIn.value); });
  launcher.addEventListener('keydown', function (e) {
    var list = visibleLaunch();
    var i = list.indexOf(d.activeElement);
    if (e.key === 'Escape') { e.preventDefault(); closeLauncher(true); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); if (list.length) list[Math.min(list.length - 1, i + 1)].focus(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); if (i <= 0) launchIn.focus(); else list[i - 1].focus(); }
    else if (e.key === 'Enter' && e.target === launchIn) { e.preventDefault(); if (list.length) list[0].click(); }
  });
  launcher.addEventListener('click', function (e) {
    if (e.target.closest('[data-close]')) { closeLauncher(true); return; }
    var b = e.target.closest('button');
    if (!b) return;
    closeLauncher(false);
    if (b.hasAttribute('data-mode')) return;
    if (b.getAttribute('data-ws')) setWS(+b.getAttribute('data-ws'));
    else if (b.getAttribute('data-act') === 'term') openTerm();
    else if (b.getAttribute('data-act') === 'cv') eject.click();
    else if (b.getAttribute('data-act') === 'lid') closeLid();
  });

  function openTerm() {
    if (mqNarrow.matches) showTerm(true); else focusWin(winTerm);
    if (!mqPhone.matches) Term.focus();
  }

  /* ════════════════════════════ bar: clock, wallpaper ════════════════════════════ */
  var clockT = 0;
  function tickClock() {
    clearTimeout(clockT);
    var now = new Date();
    clock.textContent = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    clockT = setTimeout(tickClock, (60 - now.getSeconds()) * 1000 + 50);
  }

  var wall = { fx: null, user: true, idle: false, t: 0, armed: 0 };
  function canWall() { return mqWall.matches && !mqReduce.matches && !!DP.hasWebGL && DP.hasWebGL(); }
  function wallRun(on) {
    var fx = wall.fx;
    if (!fx) return;
    if (!on) { window.cancelAnimationFrame(fx.req); fx.req = 0; }
    else if (!fx.req) { fx.prevNow = performance.now(); fx.animationLoop(); }
  }
  function syncWall() { wallRun(wall.user && !wall.idle && state === 'open' && !d.hidden); }
  function armIdle() {
    var now = performance.now();
    if (now - wall.armed < 1000 && !wall.idle) return;
    wall.armed = now;
    clearTimeout(wall.t);
    if (wall.idle) { wall.idle = false; syncWall(); }
    wall.t = setTimeout(function () { wall.idle = true; syncWall(); }, 25000);
  }
  function startWall() {
    if (wall.fx || !canWall() || !DP.loadVanta) return;
    DP.loadVanta().then(function () {
      if (wall.fx || state !== 'open' || !isDeck() || !window.VANTA || !window.VANTA.GLOBE) return;
      var dpr = window.devicePixelRatio || 1;
      wall.fx = window.VANTA.GLOBE({
        el: wallGL, THREE: window.THREE,
        mouseControls: true, touchControls: false, gyroControls: false,
        minHeight: 200, minWidth: 200, scale: Math.max(1, dpr / 1.5), scaleMobile: 1,
        color: 0x1793d1, color2: 0x5b6472, size: 1.1, backgroundColor: 0x0b0d12, backgroundAlpha: 0
      });
      window.requestAnimationFrame(function () { window.requestAnimationFrame(function () { scene.classList.add('wall-live'); }); });
      wallBtn.hidden = false;
      wall.armed = 0;
      armIdle();
      syncWall();
    }).catch(function () { /* the still stays */ });
  }
  function stopWall() {
    clearTimeout(wall.t);
    if (!wall.fx) return;
    scene.classList.remove('wall-live');
    try { wall.fx.destroy(); } catch (e) { /* gone */ }
    wall.fx = null;
    wallBtn.hidden = true;
  }
  wallBtn.addEventListener('click', function () {
    wall.user = !wall.user;
    wallBtn.setAttribute('aria-pressed', String(wall.user));
    syncWall();
  });
  scene.addEventListener('pointermove', function () { if (wall.fx) armIdle(); }, { passive: true });
  d.addEventListener('visibilitychange', syncWall);
  mqWall.addEventListener('change', function () { if (state === 'open' && isDeck()) { if (canWall()) startWall(); else stopWall(); } });

  /* ════════════════════════════ mode: deck or plain ════════════════════════════ */
  function enter(opts) {
    opts = opts || {};
    var n = wsFromHash();
    if (mqReduce.matches || sget('dpcv-open') === '1' || n) { showOpen(n || ws); return; }
    toClosed();
    if (opts.autoplay) open();
  }
  function leave() {
    killTimelines();
    stopWall();
    closeLauncher(false);
    apps.forEach(function (a) { a.classList.remove('is-active'); });
    gsap.set(apps.concat([deck, kase, intro, bar, wm, boot]), { clearProps: 'all' });
    scene.classList.remove('is-fit', 'wall-live');
    wm.classList.remove('show-term');
    setState('closed');
    d.title = BASE_TITLE;
  }
  function setMode(mode) {
    var toDeck = mode === 'deck';
    lset('dpcv-mode', mode);
    if (toDeck === isDeck()) return;
    if (toDeck) {
      root.classList.add('deck-on');
      window.scrollTo(0, 0);
      if (DP.onMode) DP.onMode('deck');
      enter({ autoplay: true });
    } else {
      leave();
      root.classList.remove('deck-on');
      if (DP.onMode) DP.onMode('plain');
      var target = window.location.hash ? d.getElementById(window.location.hash.slice(1)) : null;
      if (target && target.id !== 'top') target.scrollIntoView(); else window.scrollTo(0, 0);
      var first = d.querySelector('.nav__brand');
      if (first) first.focus({ preventScroll: true });
    }
  }

  /* ════════════════════════════ input ════════════════════════════ */
  d.addEventListener('click', function (e) {
    var b = e.target.closest('[data-mode]');
    if (!b) return;
    e.preventDefault();
    setMode(b.getAttribute('data-mode'));
  });
  $('#openDeck').addEventListener('click', open);
  kase.addEventListener('click', open);
  scene.addEventListener('click', function (e) {
    if ((state === 'opening' || state === 'booting') && !e.target.closest('#openDeck, #case')) skip();
  });
  $('#bootSkip').addEventListener('click', skip);
  keyBtns.concat(wsBtns).forEach(function (b) {
    b.addEventListener('click', function () { if (state === 'open') setWS(+b.getAttribute('data-ws')); });
  });
  termBtn.addEventListener('click', function () {
    if (mqNarrow.matches) {
      var on = !wm.classList.contains('show-term');
      showTerm(on);
      if (on && !mqPhone.matches) Term.focus();
    } else {
      focusWin(winTerm);
      Term.focus();
    }
  });
  $('#lidBtn').addEventListener('click', closeLid);
  eject.addEventListener('click', function () {
    if (!mqReduce.matches) gsap.fromTo(cartChip, { y: 0 }, { y: -10, duration: 0.16, yoyo: true, repeat: 1, ease: 'power2.out' });
  });
  wm.addEventListener('focusin', function (e) { var w = e.target.closest('.win'); if (w) focusWin(w); });
  wm.addEventListener('pointerdown', function (e) { var w = e.target.closest('.win'); if (w) focusWin(w); });
  $('.skip').addEventListener('click', function (e) {
    if (!isDeck()) return;
    e.preventDefault();
    if (state !== 'open') showOpen(ws);
    main.focus();
  });

  var KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
  var kpos = 0;
  function konami(e) {
    var k = e.key && e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (k === KONAMI[kpos]) {
      kpos++;
      if (kpos === KONAMI.length) {
        kpos = 0;
        if (state === 'open') {
          openTerm();
          Term.print([['up up down down left right left right B A', 'dim'], ['30 extra lives granted. Still not root.', 'ok']]);
        }
      }
    } else {
      kpos = k === KONAMI[0] ? 1 : 0;
    }
  }
  var metaAlone = false;
  d.addEventListener('keydown', function (e) {
    if (!isDeck()) return;
    konami(e);
    if (state === 'opening' || state === 'booting') {
      if (!e.metaKey && !e.ctrlKey && !e.altKey && e.key !== 'Shift') { e.preventDefault(); skip(); }
      return;
    }
    if (state === 'closed') {
      if (e.key === 'Enter' && (e.target === d.body || e.target === root || kase.contains(e.target))) { e.preventDefault(); open(); }
      return;
    }
    if (state !== 'open') return;
    if (e.key === 'Meta' || e.key === 'OS') { metaAlone = true; return; }
    metaAlone = false;
    if (e.key === 'Escape') { if (!launcher.hidden) { e.preventDefault(); closeLauncher(true); } return; }
    if (!launcher.hidden) return;
    if (e.ctrlKey && e.altKey && (e.key === 't' || e.key === 'T')) { e.preventDefault(); openTerm(); return; }
    if (e.target.closest && e.target.closest('input, textarea, select, [contenteditable]')) return;
    if (e.ctrlKey || e.altKey || e.metaKey) return;
    if (/^[1-6]$/.test(e.key)) { e.preventDefault(); setWS(+e.key); }
  });
  d.addEventListener('keyup', function (e) {
    if ((e.key === 'Meta' || e.key === 'OS') && metaAlone && state === 'open' && isDeck()) {
      metaAlone = false;
      if (launcher.hidden) openLauncher(); else closeLauncher(true);
    }
  });
  window.addEventListener('hashchange', function () {
    if (isDeck() && state === 'open') { var n = wsFromHash(); setWS(n || 1); }
  });
  window.addEventListener('resize', debounce(function () {
    if (!isDeck()) return;
    if (state === 'closed') fit();
    if (!mqNarrow.matches && wm.classList.contains('show-term')) { wm.classList.remove('show-term'); termBtn.setAttribute('aria-pressed', 'false'); }
  }, 120));

  /* ════════════════════════════ start ════════════════════════════ */
  $$('[data-mode="deck"]').forEach(function (b) { b.hidden = false; });
  root.setAttribute('data-deck', 'ready');
  if (isDeck()) enter({});
})();
