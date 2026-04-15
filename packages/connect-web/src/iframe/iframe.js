(function () {
    var urlParams = new URLSearchParams(window.location.href.split('?')[1]); // TODO: could it throw? catch it?
    var id = urlParams.get('connect-popup-req'); // TODO rename

    console.log('Iframe initialized with id:', id);

    var broadcast;
    try {
        broadcast = new BroadcastChannel('@trezor/connect-popup/' + id);
    } catch (e) {
        console.error('BroadcastChannel is not supported in this browser', e);
    }

    // handle message from suite-web and forward it to 3rd party web page
    broadcast.addEventListener('message', function (event) {
        console.log('Iframe forward to host', event.data);
        window.parent.postMessage(event.data, '*');
    });

    // handle message from 3rd party web page and forward it to suite-web
    window.addEventListener('message', function (event) {
        console.log('Iframe forward to suite-web', event.data);
        if (broadcast) {
            broadcast.postMessage(event.data);
        } else {
            console.error('BroadcastChannel is not available, cannot forward message to suite-web');
        }
    });
})();
