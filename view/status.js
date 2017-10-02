//
// Status printer window.
//
var printer_table     = document.querySelector("#printers table");
var serial_table      = document.querySelector("#serials table");
var disconnected_div  = document.querySelector("#disconnected");
var connected_div     = document.querySelector("#connected");
var disconnect_button = document.querySelector("#connected button");
var connect_button    = document.querySelector("#disconnected button");
var server_input      = document.querySelector("input[name=server]");
var server_text       = document.querySelector("#server");
var server_href       = document.querySelector("a#server");
var server_button     = document.querySelector("#url button");
var login_text        = document.querySelector("b#login");
var database_text     = document.querySelector("b#database");
var database_input    = document.querySelector("select[name='database']");
var login_input       = document.querySelector("input[name='login']");
var password_input    = document.querySelector("input[name='password']");
var login_button      = document.querySelector("button[name='login']");
var cancel_button     = document.querySelector("button[name='cancel']");
var alert_text        = document.querySelector("#alert");
var logger_section    = document.querySelector("#logger");
var state_url         = document.querySelectorAll(".state_url");
var overlay           = document.querySelector("#overlay");
var no_local_printers = document.querySelectorAll(".no_local_printers");
var local_printers    = document.querySelectorAll(".local_printers");

var states = [ 'url', 'login', 'online' ];
var state = 'url'

var buttons_html="\
<button class=\"clean\" id=\"short_test\" title=\"Short Test\">\
  <span class=\"fa-stack fa-lg\">\
  <i class=\"fa fa-file-o fa-stack-2x\"></i>\
  <i class=\"fa fa-gear fa-stack-1x\"></i>\
  </span>\
</button>\
<button class=\"clean\" id=\"large_test\" title=\"Large Test\">\
  <span class=\"fa-stack fa-lg\">\
  <i class=\"fa fa-file-o fa-stack-2x\"></i>\
  <i class=\"fa fa-gears fa-stack-1x\"></i>\
  </span>\
</button>\
<button class=\"clean\" id=\"advance_paper\" title=\"Forward Paper\">\
  <span class=\"fa-stack fa-lg\">\
  <i class=\"fa fa-file-o fa-stack-2x\"></i>\
  <i class=\"fa fa-step-forward fa-stack-1x\"></i>\
  </span>\
</button>\
<button class=\"clean\" id=\"cup_paper\" title=\"Cut Paper\">\
  <span class=\"fa-stack fa-lg\">\
  <i class=\"fa fa-file-o fa-stack-2x\"></i>\
  <i class=\"fa fa-cut fa-stack-1x\"></i>\
  </span>\
</span>\
<button class=\"clean\" id=\"open_fiscal_journal\" title=\"Open day\">\
  <span class=\"fa-stack fa-lg\">\
  <i class=\"fa fa-file-o fa-stack-2x\"></i>\
  <i class=\"fa fa-money fa-stack-1x\"></i>\
  </span>\
</button>\
<button class=\"clean\" id=\"close_fiscal_journal\" title=\"Close day\">\
  <span class=\"fa-stack fa-lg\">\
  <i class=\"fa fa-file-o fa-stack-2x\"></i>\
  <i class=\"fa fa-money fa-stack-1x\"></i>\
  <i class=\"fa fa-ban fa-stack-1x text-danger\"></i>\
  </span>\
</button>\
<button class=\"clean\" id=\"shift_change\" title=\"Change Shifts\">\
  <span class=\"fa-stack fa-lg\">\
  <i class=\"fa fa-file-o fa-stack-2x\"></i>\
  <i class=\"fa fa-exchange fa-stack-1x\"></i>\
  </span>\
</button>\
<button class=\"clean\" id=\"cancel_fiscal_ticket\" title=\"Cancel Ticket\">\
  <span class=\"fa-stack fa-lg\">\
  <i class=\"fa fa-file-o fa-stack-1x\"></i>\
  <i class=\"fa fa-ban fa-stack-2x text-danger\"></i>\
  </span>\
</button>\
";

// Default values for form.
chrome.storage.local.get(['server', 'session_id'], function(value) {
    server.text.value = value.server;
});

// First, checks if it isn't implemented yet.
if (!String.prototype.format) {
  String.prototype.format = function() {
    var args = arguments;
    return this.replace(/{(\d+)}/g, function(match, number) {
      return typeof args[number] != 'undefined'
        ? args[number]
        : match
      ;
    });
  };
}


function block_screen() {
    overlay.style.display = "block";
}

function unblock_screen() {
    overlay.style.display = "none";
}

function set_state(_state) {
    var session = window.session;

    block_screen();
    state = _state;
    states.forEach(function(st) {
        [].forEach.call(document.querySelectorAll(".state_" + st), function(el) {
            el.hidden=(state != st);
        });
    });
    finish = function() {
        update_view();
        unblock_screen();
    }
    switch (state) {
        case 'url':
            if (session.server) server_input.value = session.server;
            if (session.session_id) session.logout(finish);
            else finish();
            break;
        case 'login':
            if (server_input.value) {
                if (session.session_id)
                    session.logout(function() {
                        load_databases(server_input.value, finish);
                    });
                else
                        load_databases(server_input.value, finish);
            } else {
                set_state('url');
                finish();
            }
            break;
        case 'online':
            if (login_input.value && password_input.value) {
                session.authenticate(
                    database_input.selectedOptions[0].attributes.value.value,
                    login_input.value,
                    password_input.value,
                    function(result){
                        if (result && session.session_id && session.uid) {
                            finish();
                            window.close();
                        } else {
                            do_alert("Error logging.");
                            set_state('login');
                            finish();
                        }
                    });
            } else {
                if (session.session_id) {
                    finish()
                } else {
                    set_state('login');
                    finish();
                }
            }
            break;
        default:
            set_state('url');
            finish();
    }
}

function do_alert(message) {
    var message_element = document.createElement("p");
    message_element.textContent = message;
    alert_text.appendChild(message_element);
    window.setTimeout(function(){
        message_element.className="fadeout";
        window.setTimeout(function(){
            alert_text.removeChild(message_element);
        }, 2000);
    }, 4000);
};

function do_printer_alert(message, res) {
    if (res.result) {
        do_alert(res.strResult);
    } else {
        do_alert(message);
    };
};

function do_message(dir, message) {
    var message_element = document.createElement("p");
    message_element.textContent = dir + "|" + message;
    logger_section.appendChild(message_element);
    //update_view();
}

function load_databases(url, callback) {
    var on_error = function(mess) {
        do_alert("Connection problem with OpenERP server.\n" + session.server + ". " + mess);
        server_input.selectedIndex = 0;
        session.server = null;
        set_state('url');
        callback();
    };
    if (window.session) {
        session.server = url.replace(/\/$/i, "");
        while (database_input.firstChild) { database_input.removeChild(database_input.firstChild); }
        session.get_database_list(function(mess, databases) {
            if (mess == "done") {
                for (var db in databases) {
                    var option = document.createElement("option");
                    option.text = databases[db];
                    option.value = databases[db];
                    database_input.add(option);
                    option.selected = session.db && option.value == session.db;
                };
                if (database_input.childNodes.length==0) {
                    on_error("Can't list databases.");
                };
                callback();
            } else {
                on_error("Can't complete database list call.");
                callback();
            }
        });
    } else {
        on_error("No window session.");
        callback();
    };
};

function update_view() {
    if (window.session === undefined) {
        return;
    };

    //console.log(window.session);

    server_text.textContent = session && session.server || "[NONE]";
    server_href.href = session && (session.server + "?db=" + session.db) || "[NONE]";
    login_text.textContent = session && session.username || "[NONE]";
    database_text.textContent = session && session.db || "[NONE]";

    // Remove printers
    for(var i = printer_table.rows.length; i > 0; i--) {
        printer_table.deleteRow(0)
    };

    // Add printers
    for (p in session.printers) {
            var row = printer_table.insertRow(0);
            var cell1 = row.insertCell(0);
            var cell2 = row.insertCell(1);
            var printer = session.printers[p];
            row.setAttribute('printer_id', p);
            cell1.innerHTML = p;
            cell2.innerHTML = buttons_html;
            var getPrinter = function(e) { return session.printers[e.target.parentNode.parentNode.parentNode.parentNode.getAttribute('printer_id')]; };

            cell2.childNodes[0].addEventListener('click', function(e) {
                getPrinter(e).short_test(function(res) { do_printer_alert("Executed short test", res); });
            });
            cell2.childNodes[1].addEventListener('click', function(e) {
                getPrinter(e).large_test(function(res) { do_printer_alert("Executed large test.", res); });
            });
            cell2.childNodes[2].addEventListener('click', function(e) {
                getPrinter(e).advance_paper(1, function(res) { do_printer_alert("Executed advance paper.", res); });
            });
            cell2.childNodes[3].addEventListener('click', function(e) {
                //console.log(getPrinter(e));
                var options = [false, false, false, false];

                var ticket = {
                    turist_ticket: false,
                    debit_note: false,
                    partner: {
                        name: "",
                        //name_2: "?",
                        address: "",
                        //address_2: "Buenos Aires",
                        //address_3: "Argentina",
                        document_type: "C",
                        document_number: "11111111",
                        responsability: "F"
                    },
                    //related_document: "?",
                    //related_document_2: "?",
                    //turist_check: "?",
                    lines: [ {
                        item_action: "sale_item",
                        as_gross: false,
                        send_subtotal: false,
                        check_item: false,
                        collect_type: "q",
                        large_label: "",
                        first_line_label: "",
                        description: "",
                        description_2: "",
                        description_3: "",
                        description_4: "",
                        item_description: "Item 1",
                        quantity: 1,
                        unit_price: 0.1,
                        vat_rate: 21.0,
                        fixed_taxes: 0,
                        taxes_rate: 0
                    }
                    ],
                    discounts: [ {
                        type: 'discount',
                        description: 'Descuento de prueba',
                        amount: 0.05
                    }],
                    payments: [ {
                        null_pay: false,
                        include_in_arching: false,
                        card_pay: true,
                        extra_description: '3 pagos',
                        description: 'VISA',
                        amount: 0.05
                    }],
                    cut_paper: true,
                    electronic_answer: false,
                    print_return_attribute: false,
                    current_account_automatic_pay: false,
                    print_quantities: false,
                    tail_no: 0,
                    tail_text: "Test 002 003",
                    tail_no_2: 0,
                    tail_text_2: "",
                    tail_no_3: 0,
                    tail_text_3: ""
                };
                console.log(e);
                alert(e);
                //getPrinter(e).make_ticket_factura(options, ticket, function(res){ console.log(res) });
                //getPrinter(e).make_ticket_factura(options, ticket, function(res){ console.log(res) });

                /*var ticket = {
                    lines: [ {
                        item_action: "sale_item",
                        as_gross: false,
                        send_subtotal: false,
                        check_item: false,
                        collect_type: "q",
                        large_label: false,
                        first_line_label: false,
                        description: "",
                        description_2: "",
                        description_3: "",
                        description_4: "",
                        item_description: "Item 1",
                        quantity: 1,
                        unit_price: 0.2,
                        vat_rate: 21.0,
                        fixed_taxes: 0,
                        taxes_rate: 0
                    }],
                    discounts: [
                        type: 'discount',
                        description: 'Descuento de prueba',
                        amount: 0.1
                    }],
                    payments: [ {
                        null_pay: false,
                        include_in_arching: false,
                        card_pay: false,
                        extra_description: '1 pago',
                        description: 'Efectivo',
                        amount: 1.00
                    }],
                    cut_paper: true,
                    electronic_answer: false,
                    print_return_attribute: false,
                    current_account_automatic_pay: false,
                    print_quantities: true,
                    tail_no: 0,
                    tail_text: "",
                    tail_no_2: 0,
                    tail_text_2: "",
                    tail_no_3: 0,
                    tail_text_3: ""
                };

                getPrinter(e).make_fiscal_ticket(ticket, function(res){ console.log(res) });*/
                //getPrinter(e).cut_paper(function(res) { do_printer_alert("Executed cut paper.", res); });
            });
            cell2.childNodes[4].addEventListener('click', function(e) {
                getPrinter(e).open_fiscal_journal(function(res) { do_printer_alert("Executed Open day.", res); });
            });
            cell2.childNodes[5].addEventListener('click', function(e) {
                getPrinter(e).close_fiscal_journal(function(res) { do_printer_alert("Executed Close day.", res); });
            });
            cell2.childNodes[6].addEventListener('click', function(e) {
                getPrinter(e).shift_change(function(res) { console.log(res); do_printer_alert("Executed Change Shift.", res); });
            });
            cell2.childNodes[7].addEventListener('click', function(e) {
                getPrinter(e).cancel_fiscal_ticket( function(res) { console.log(res); do_printer_alert("Cancel ticket done.", res); });
            });
    };
    if (printer_table.rows.length == 0) {
        [].forEach.call(no_local_printers, function(it) { it.style.display="block";});
        [].forEach.call(local_printers, function(it) { it.style.display="none";});
    } else {
        [].forEach.call(no_local_printers, function(it) { it.style.display="none";});
        [].forEach.call(local_printers, function(it) { it.style.display="block";});
    }
    session.onmessage = do_message;
};

function update() {
	if (window.session && session.session_id) {
		session.get_session_info(function(sess) {
			update_view();
		});
	} else {
	    update_view();
    }
};

window.update = update;
window.show_alert = do_alert;

disconnect_button.onclick = function(event) {
    set_state('login');
};

server_button.onclick = function(event) {
    set_state('login');
}

login_button.onclick = function(event) {
    set_state('online');
};

cancel_button.onclick = function(event) {
    set_state('url');
}

do_message("Start window");
if (window.session && window.session.session_id) {
    set_state('online');
} else {
    if (window.session.server) server_input.value = session.server;
    set_state('url');
};
update();

window.session.onchange = function() { update_view(); }

// sencillo
// awbxukki

// vim:expandtab:smartindent:tabstop=4:softtabstop=4:shiftwidth=4:
