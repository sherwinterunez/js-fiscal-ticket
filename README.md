# JS Fiscal Printer

JS Fiscal Printer work as Google Chrome extension.

## Introduction

This application is only works in Chrome as an Application. It's need USB and RS232 Serial permittions to access to local printers. Once you connect to a Server you can print Tickets and print Z report from your web application. 

## Installation

- Install this extension in your Google Chrome
- Click on Programmer mode checkbox and copy the ID number. For example: aapocclcgogkmdfdskdopfmhonfmgoek
- Copy this code into your web application:

JSON:



<button id="print-ticket">Print Ticket</button>

<script>
$(document).ready(function(){
        $('#print-ticket').click(function(){
           chrome.runtime.sendMessage("CHROME_EXTENSION_ID", {ticketJson: Json});
        });
    });
</script>

Replace CHROME_EXTENSION_ID with ID.


## List of Supported and tested Printers

|EPSON|TM U220 AF II (v.22.00) Hera|AFIP 2767|17/02/10|PEO|2|Dev (Epson-D)|
