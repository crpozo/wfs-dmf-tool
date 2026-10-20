{{-- Floating "How to get started" video button and its modal (markup and ids unchanged from the original). --}}
<div class="video-help-control" id="videoHelpControl">
    <button type="button" class="video-help-button" id="videoHelpButton" aria-label="Open help video">
        <img src="@assetv('images/howTo.png')" alt="" class="video-help-button-image" />
        <span class="video-help-question" aria-hidden="true">?</span>
    </button>
    <button type="button" class="video-help-toggle" id="videoHelpToggle" aria-label="Minimize help video button" aria-pressed="false" title="Minimize help button">
        <span aria-hidden="true">&minus;</span>
    </button>
</div>

<div class="video-help-modal" id="videoHelpModal" aria-hidden="true" role="dialog" aria-label="Help video">
    <div class="video-help-dialog">
        <button type="button" class="video-help-close" id="videoHelpClose" aria-label="Close help video">X</button>
        <video class="video-help-player" id="videoHelpPlayer" playsinline preload="metadata">
            <source src="@assetv('vid/wfs.mp4')" type="video/mp4" />
        </video>
    </div>
</div>

<script>
    (function () {
        var videoHelpButton = document.getElementById('videoHelpButton');
        var videoHelpControl = document.getElementById('videoHelpControl');
        var videoHelpToggle = document.getElementById('videoHelpToggle');
        var videoHelpModal = document.getElementById('videoHelpModal');
        var videoHelpClose = document.getElementById('videoHelpClose');
        var videoHelpPlayer = document.getElementById('videoHelpPlayer');

        function openVideoHelp() {
            videoHelpModal.classList.add('is-open');
            videoHelpModal.setAttribute('aria-hidden', 'false');
            videoHelpPlayer.currentTime = 0;
            videoHelpPlayer.play();
        }

        function closeVideoHelp() {
            videoHelpModal.classList.remove('is-open');
            videoHelpModal.setAttribute('aria-hidden', 'true');
            videoHelpPlayer.pause();
            videoHelpPlayer.currentTime = 0;
        }

        function toggleVideoHelpSize() {
            var isMinimized = videoHelpControl.classList.toggle('is-minimized');
            videoHelpButton.classList.remove('attention');
            videoHelpToggle.setAttribute('aria-label', isMinimized ? 'Restore full help video button' : 'Minimize help video button');
            videoHelpToggle.setAttribute('aria-pressed', String(isMinimized));
            videoHelpToggle.setAttribute('title', isMinimized ? 'Restore help button' : 'Minimize help button');
            videoHelpToggle.querySelector('span').textContent = isMinimized ? '+' : '−';
        }

        videoHelpButton.addEventListener('click', openVideoHelp);
        videoHelpToggle.addEventListener('click', toggleVideoHelpSize);
        videoHelpClose.addEventListener('click', closeVideoHelp);
        videoHelpModal.addEventListener('click', function (event) {
            if (event.target === videoHelpModal) { closeVideoHelp(); }
        });
        document.addEventListener('keydown', function (event) {
            if (event.key === 'Escape' && videoHelpModal.classList.contains('is-open')) { closeVideoHelp(); }
        });
        window.addEventListener('load', function () { videoHelpButton.classList.add('attention'); });
    })();
</script>
