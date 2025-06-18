// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.13;

import {Test} from "../lib/forge-std/src/Test.sol";
import {console} from "../lib/forge-std/src/console.sol";
import "../src/Chainvoice.sol";

contract TestChainvoice is Test {
    Chainvoice c;

    // Allow receiving Ether
    receive() external payable {}

    // Test constants
    string public encryptedData = "encrypted-invoice-data";
    string public encryptedHash = "encrypted-data-hash";
    uint256 public fee = 0.0005 ether;

    // Setup before each test
    function setUp() public {
        c = new Chainvoice();
    }

    function testCreateInvoice() public {
        address receiverAdd = 0x24F13d40CF7DE6a81a2a1949aA45F2242e81f1e2;

        c.createInvoice(receiverAdd, encryptedData, encryptedHash);

        Chainvoice.InvoiceDetails[] memory sent = c.getSentInvoices(address(this));
        assertEq(sent.length, 1);
        assertEq(sent[0].to, receiverAdd);
        assertEq(sent[0].from, address(this));
        assertEq(sent[0].isPaid, false);
    }

    function testPayInvoice() public {
        address receiverAdd = 0x24F13d40CF7DE6a81a2a1949aA45F2242e81f1e2;
        uint256 amount = 100;

        // Create invoice from test contract to receiver
        c.createInvoice(receiverAdd, encryptedData, encryptedHash);

        // Fund the receiver address for test (simulate real user wallet with ETH)
        vm.deal(receiverAdd, amount + fee + 1); // Add a tiny buffer to avoid exact match errors

        // Log fee
        console.log("Fee in native currency: ", fee);

        // Log receiver balance before
        uint256 initialBalance = receiverAdd.balance;
        console.log("Initial Receiver Balance: ", initialBalance);

        // Prank as receiver and pay the invoice
        vm.prank(receiverAdd);
        c.payInvoice{value: amount + fee}(0); // Invoice ID 0

        // Fetch sent invoices for this contract
        Chainvoice.InvoiceDetails[] memory sentInvoices = c.getSentInvoices(address(this));

        // Assertions
        assertEq(sentInvoices.length, 1);
        assertEq(sentInvoices[0].to, receiverAdd);
        assertTrue(sentInvoices[0].isPaid);

        // Contract fee tracking
        assertEq(c.accumulatedFees(), fee);

        // Final balance check for receiver
        uint256 finalBalance = receiverAdd.balance;
        console.log("Final Receiver Balance: ", finalBalance);
        assertEq(finalBalance, initialBalance - (amount + fee));

        // Debug logs
        console.log("Sender Address: ", address(this));
        console.log("Receiver Address: ", receiverAdd);
        console.log("Invoice Amount Due: ", amount);
        console.log("Paid: ", sentInvoices[0].isPaid);
        console.log("Accumulated Fees: ", c.accumulatedFees());
        console.log("-------------------------------------------");
    }
}
