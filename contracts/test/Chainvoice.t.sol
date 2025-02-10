// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.13;

import {Test} from '../lib/forge-std/src/Test.sol';
import {console} from "../lib/forge-std/src/console.sol";
import "../src/Chainvoice.sol";

contract TestChainvoice is Test {
    Chainvoice c;

    receive() external payable {}

    function setUp() public {
        c = new Chainvoice();
    }

    function testCreateInvoice() public {
        address receiverAdd = 0x24F13d40CF7DE6a81a2a1949aA45F2242e81f1e2;
        uint256 amount = 100;
        Chainvoice.UserDetails memory sender = Chainvoice.UserDetails({
            fname: "Alice",
            lname: "Doe",
            email: "alice@example.com",
            country: "UK",
            city: "London",
            postalcode: "SW1A 1AA"
        });
        Chainvoice.UserDetails memory receiver = Chainvoice.UserDetails({
            fname: "Bob",
            lname: "Smith",
            email: "bob@example.com",
            country: "UK",
            city: "Manchester",
            postalcode: "M1 1AA"
        });

        Chainvoice.ItemData[] memory items=new Chainvoice.ItemData[](1);
        items[0] = Chainvoice.ItemData({
            description: "Laptop",
            qty: 1,
            unitPrice: 1000,
            discount: 100,
            tax: 50,
            amount: 950
        });


        c.createInvoice(
            amount,
            receiverAdd,
            sender,
            receiver,
            items
        );

        Chainvoice.InvoiceDetails[] memory sentInvoices = c.getMySentInvoices();
        assertEq(sentInvoices.length, 1);
        assertEq(sentInvoices[0].to, receiverAdd);
        // assertEq(sentInvoices[0].amountDue, amount);
        assertTrue(sentInvoices[0].isPaid == false);
        console.log("Sent Invoices Length: ", c.getMySentInvoices().length);
        console.log("Sender Address: ", address(this));
        console.log("Receiver Address: ", receiverAdd);
        console.log("Invoice Amount Due: ", amount);
        console.log("-------------------------------------------");

        Chainvoice.InvoiceDetails[] memory receivedInvoices = c
            .getMyReceivedInvoices(0x24F13d40CF7DE6a81a2a1949aA45F2242e81f1e2);
        assertEq(receivedInvoices.length, 1);
        assertEq(
            receivedInvoices[0].to,
            0x24F13d40CF7DE6a81a2a1949aA45F2242e81f1e2
        );
        assertEq(receivedInvoices[0].from, address(this));
        assertEq(receivedInvoices[0].amountDue, amount);
        assertTrue(receivedInvoices[0].isPaid == false);
    }

    function testPayInvoice() public {
        address receiverAdd = 0x24F13d40CF7DE6a81a2a1949aA45F2242e81f1e2;
        uint256 amount = 100;
        Chainvoice.UserDetails memory sender = Chainvoice.UserDetails({
            fname: "Alice",
            lname: "Doe",
            email: "alice@example.com",
            country: "UK",
            city: "London",
            postalcode: "SW1A 1AA"
        });
        Chainvoice.UserDetails memory receiver = Chainvoice.UserDetails({
            fname: "Bob",
            lname: "Smith",
            email: "bob@example.com",
            country: "UK",
            city: "Manchester",
            postalcode: "M1 1AA"
        });

        Chainvoice.ItemData[] memory Items=new Chainvoice.ItemData[](1); 
        Items[0]=Chainvoice.ItemData({
                description: "Laptop",
                qty: 1,
                unitPrice: 1000,
                discount: 100,
                tax: 50,
                amount: 950
            });

        c.createInvoice(
            amount,
            receiverAdd,
            sender,
            receiver,
            Items
        );

        vm.deal(receiverAdd, 1000);
        console.log("Receiver Balance: ", address(receiverAdd).balance);
        vm.prank(receiverAdd);
        c.payInvoice{value: amount}(0);
        Chainvoice.InvoiceDetails[] memory sentInvoices = c.getMySentInvoices();
        assertEq(sentInvoices.length, 1);
        assertEq(sentInvoices[0].to, receiverAdd);
        assertEq(sentInvoices[0].amountDue, amount);
        assertTrue(sentInvoices[0].isPaid == true);
        console.log("Sent Invoices Length: ", c.getMySentInvoices().length);
        console.log("Sender Address: ", address(this));
        console.log("Receiver Address: ", receiverAdd);
        console.log("Invoice Amount Due: ", amount);
        console.log("Paid", sentInvoices[0].isPaid);
        console.log("-------------------------------------------");
    }

    
}
