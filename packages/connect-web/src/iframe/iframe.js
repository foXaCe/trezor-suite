(function () {
    var urlParams = new URLSearchParams(window.location.href.split('?')[1]); // TODO: could it throw? catch it?
    var channelId = urlParams.get('connect-popup-req'); // TODO rename

    console.log('Iframe initialized with id:', channelId);

    document
        .requestStorageAccess({
            BroadcastChannel: true,
        })
        .then(() => {
            console.log('Storage access granted');
        })
        .catch(error => {
            console.error('Storage access denied', error);
        });

    var broadcast;
    try {
        broadcast = new BroadcastChannel('@trezor/connect-popup/' + channelId);
    } catch (e) {
        console.error('BroadcastChannel is not supported in this browser', e);
    }

    // handle message from suite-web and forward it to 3rd party web page
    broadcast.addEventListener('message', function (event) {
        console.log('Iframe forward to host', event.data);
        window.parent.postMessage(event.data, '*');
    });

    // handle message from 3rd party web page and forward it to suite-web
    // <iframe sandbox="allow-scripts allow-popups allow-same-origin"
    window.addEventListener('message', function (event) {
        console.log('Iframe forward to suite-web', event.data);
        // if (event.data?.type === 'connect-popup-open') {
        //     console.warn('Received message without type, ignoring', event.data);

        //     const popup = window.open('', 'connect-popup-' + channelId);
        //     if (popup) {
        //         popup.location.href = event.data?.url;
        //     }

        //     return;
        // }
        if (broadcast) {
            broadcast.postMessage(event.data);
        } else {
            console.error('BroadcastChannel is not available, cannot forward message to suite-web');
        }
    });
})();
