// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.13;
import {Test} from "../lib/forge-std/src/Test.sol";
import {console} from "../lib/forge-std/src/console.sol";


contract Chainvoice {
    struct UserDetails {
        string fname;
        string lname;
        string email;
        string country;
        string city;
        string postalcode;
    }
    struct ItemData {
        string description;
        int256 qty;
        int256 unitPrice;
        int256 discount;
        int256 tax;
        int256 amount;
    }
    struct InvoiceDetails {
        uint256 id;
        address from;
        UserDetails user; // Struct to store user details
        address to;
        UserDetails client; // Struct to store client details
        uint256 amountDue;
        bool isPaid;
    }

    InvoiceDetails[] public invoices;
    mapping(address => uint256[]) public sentInvoices;
    mapping(address => uint256[]) public receivedInvoices;
    mapping(uint256 => ItemData[]) public itemDatas;

    event InvoiceCreated(
        uint256 id,
        address indexed from,
        address indexed to,
        uint256 amountDue
    );
    event InvoicePaid(
        uint256 id,
        address indexed from,
        address indexed to,
        uint256 amountPaid
    );

    function createInvoice(
        uint256 amountDue,
        address to,
        UserDetails memory user,
        UserDetails memory client,
        ItemData[] memory _items
    ) external {
        require(amountDue > 0, "Amount must be greater than zero");
        require(to != address(0), "Receiver address cannot be zero");
        require(to != msg.sender, "Cannot create invoice for yourself");

        uint256 invoiceId = invoices.length;
        invoices.push(
            InvoiceDetails({
                id: invoiceId,
                from: msg.sender,
                user: user,
                to: to,
                client: client,
                amountDue: amountDue,
                isPaid: false
            })
        );

        for (uint i = 0; i < _items.length; i++) {
            itemDatas[invoiceId].push(_items[i]);
        }

        sentInvoices[msg.sender].push(invoiceId);
        receivedInvoices[to].push(invoiceId);

        emit InvoiceCreated(invoiceId, msg.sender, to, amountDue);
    }

    function payInvoice(uint256 invoiceId) external payable {
        require(invoiceId < invoices.length, "Invalid invoice ID");
        InvoiceDetails storage invoice = invoices[invoiceId];
        require(msg.sender == invoice.to, "Not authorized to pay this invoice");
        require(!invoice.isPaid, "Invoice already paid");
        require(msg.value == invoice.amountDue, "Incorrect payment amount");

        (bool success, ) = payable(invoice.from).call{value: msg.value}("");
        require(success, "Payment transfer failed");

        invoice.isPaid = true;
        emit InvoicePaid(invoiceId, invoice.from, msg.sender, msg.value);
    }

    function getMySentInvoices() external view returns (InvoiceDetails[] memory) {
        return _getInvoices(sentInvoices[msg.sender]);
    }

    function getMyReceivedInvoices(address add) external view returns (InvoiceDetails[] memory) {
        return _getInvoices(receivedInvoices[add]);
    }

    function _getInvoices(uint256[] storage invoiceIds) internal view returns (InvoiceDetails[] memory) {
        InvoiceDetails[] memory userInvoices = new InvoiceDetails[](invoiceIds.length);
        for (uint256 i = 0; i < invoiceIds.length; i++) {
            userInvoices[i] = invoices[invoiceIds[i]];
        }
        return userInvoices;
    }
}
