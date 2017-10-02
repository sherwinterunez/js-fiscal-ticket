//
// Backgroup process application.
//
chrome.runtime.onMessageExternal.addListener(
    function(request, sender, sendResponse) {
        ticket_json = JSON.parse(request.ticketJson);
        printZ = JSON.parse(request.printZ);
        getAlive = JSON.parse(request.getAlive);

        // Add printers
        console.debug('buscando impresora');
        for (p in window.session.printers) {
            //var getPrinter = function(e) { return window.session.printers[e.target.parentNode.parentNode.parentNode.parentNode.getAttribute('printer_id')]; };
            var options = [false, false, false, false];
            if(p.indexOf("TM-U220") > -1){
                console.log('impresora encontrada');
                
                if(getAlive == true){
                    console.log('get conection alive');
                    //window.session.printers[p].close_fiscal_journal(function(res) { console.log("Executed Close day."); console.log(res); });
                    return true;
                }

                if(printZ == true){
                    console.log('infome z');
                    window.session.printers[p].close_fiscal_journal(function(res) { console.log("Executed Close day."); console.log(res); });
                    return true;
                }

                console.log('imprimir ticket');
                window.session.printers[p].make_ticket_factura(options, ticket_json, function(res){ console.log(res) });
            }
        }
    });


var session = null;
var pooling_time = 300;

// Function searching for new printers or remove then if disconnected.
function poolingPrinter() {
    setTimeout(function(){
            if (session) {
                console.debug("[FP] Pooling for printers");
                session.update(poolingPrinter);
                pooling_time = 6000;
            }
        }, pooling_time);
};

function open_status(sess) {
    if (sess) {
        if (chrome.app.window.get('status') == null) {
            //chrome.app.window.create();
        };
    } else {
        setTimeout(function() { open_status(sess); }, 1000);
    }
};

function login(callback) {
    console.debug("[SES] Start background login.");

    // Not login if exists session_id.
    if (session && session.session_id) {
        console.debug("[SES] I dont need login if a session exists.");
        return
    };

    // Login.
    chrome.storage.local.get(['server', 'session_id'], function(value) {
        console.debug("[SES] Creating the session.");
        session = new oerpSession(value.server, value.session_id);
        session.addListener('login', function(s) {
            console.log("Successful login.");
            chrome.storage.local.set({
                server: session.server,
                session_id: session.session_id, });
                session.init_server_events(control_server_events);
        });
        session.addListener('logout', function(s) {
            console.debug("[SES] Logout.");
            chrome.storage.local.set({
                server: null,
                session_id: null, });
            session.session_id = null;

        });
        session.addListener('login_error', function(s) {
            console.debug("[SES] Login error. Forget session_id.");
            chrome.storage.local.set({
                'session_id': null
            });
            session.session_id = null;
            session.message = "Login error"
            open_status(session);
        });
        session.addListener('error', function(s) {
            console.debug("[SES] Session error. Forget session_id.");
            for (i in session.receptor) session.receptor[i].close();
            chrome.storage.local.set({
                'server': session.server,
                'session_id': null
            });
            session.session_id = null;
            session.message = "Session error"
            open_status(session);
        });
        session.addListener('expired', function(s) {
            console.debug("[SES] Session expired. Forget session_id.");
            for (i in session.receptor) session.receptor[i].close();
            chrome.storage.local.set({
                'server': session.server,
                'session_id': null
            });
            session.session_id = null;
            session.message = "Login expired"
            open_status(session);
        });
        session.addListener('spool_open', function(s) {
            console.debug("[SES] Open spool.");
        });
        session.addListener('spool_close', function(s) {
            console.debug("[SES] Close spool.");
        });
        session.addListener('spool_error', function(s) {
            console.debug("[SES] Error spool.");
        });
        session.addListener('spool_message', function(s) {
            console.debug("[SES] Message spool.");
        });
        session.init(callback);
    });
};

// Start login.
login(function(){
    // Set status windows when application is launched.
    chrome.app.runtime.onLaunched.addListener(function() {
        console.debug("[SYS] Launch status");
        open_status(session);
    });
    chrome.app.runtime.onRestarted.addListener(function(){
        console.debug("[SYS] Restart");
        session.clean_server_events();
    })
});

poolingPrinter();



// vim:expandtab:smartindent:tabstop=4:softtabstop=4:shiftwidth=4:
