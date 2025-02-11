// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.13;
import {Test} from "../lib/forge-std/src/Test.sol";
import {console} from "../lib/forge-std/src/console.sol";
import {AggregatorV3Interface} from "../lib/chainlink-brownie-contracts/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";
contract Chainvoice {
    AggregatorV3Interface internal priceFeed;
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

    address public owner;
    address public treasuryAddress;
    uint16 public feeAmountInUSD;

    constructor(address _priceFeed) {
        priceFeed = AggregatorV3Interface(_priceFeed);
        owner = msg.sender;
        feeAmountInUSD = 1;
    }


    modifier OnlyOwner() {
        require(msg.sender == owner, "Only Owner is accessible");
        _;
    }
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

        for (uint256 i = 0; i < _items.length; i++) {
            itemDatas[invoiceId].push(_items[i]);
        }

        sentInvoices[msg.sender].push(invoiceId);
        receivedInvoices[to].push(invoiceId);

        emit InvoiceCreated(invoiceId, msg.sender, to, amountDue);
    }


    function usdToNativeCurrencyConversion() public view returns(uint256) {
        (, int256 answer, , , ) = priceFeed.latestRoundData();
        require(answer > 0, "Invalid price data");
        uint256 ethPriceAdjusted = uint256(answer);
        return (feeAmountInUSD * 1e18) / ethPriceAdjusted;
    }
    uint256 public accumulatedFees;
   function payInvoice(uint256 invoiceId) external payable {
        require(invoiceId < invoices.length, "Invalid invoice ID");
        InvoiceDetails storage invoice = invoices[invoiceId];
        require(msg.sender == invoice.to, "Not authorized to pay this invoice");
        require(!invoice.isPaid, "Invoice already paid");

        // Calculate fee in native currency
        uint256 feeAmountInNativeCurrency = usdToNativeCurrencyConversion();
        require(
            msg.value >= invoice.amountDue + feeAmountInNativeCurrency,
            "Payment must cover the invoice amount and fee"
        );

        // Deduct fee from payment
        uint256 amountToRecipient = msg.value - feeAmountInNativeCurrency;

        // Transfer payment to invoice recipient
        (bool success, ) = payable(invoice.from).call{value: amountToRecipient}("");
        require(success, "Payment transfer failed");

        // Accumulate fee in contract
        accumulatedFees += feeAmountInNativeCurrency;

        // Mark invoice as paid
        invoice.isPaid = true;
    }
    function getMySentInvoices()
        external
        view
        returns (InvoiceDetails[] memory)
    {
        return _getInvoices(sentInvoices[msg.sender]);
    }

    function getMyReceivedInvoices(address add)
        external
        view
        returns (InvoiceDetails[] memory)
    {
        return _getInvoices(receivedInvoices[add]);
    }

    function _getInvoices(uint256[] storage invoiceIds)
        internal
        view
        returns (InvoiceDetails[] memory)
    {
        InvoiceDetails[] memory userInvoices = new InvoiceDetails[](
            invoiceIds.length
        );
        for (uint256 i = 0; i < invoiceIds.length; i++) {
            userInvoices[i] = invoices[invoiceIds[i]];
        }
        return userInvoices;
    }

    function setTreasuryAddress(address add) public OnlyOwner {
        require(add != address(0), "Treasury Address cannot be equal to zero");
        treasuryAddress = add;
    }

    function setFeeAmount(uint16 fee) public OnlyOwner {
        feeAmountInUSD = fee;
    }
    function withdraw() external {
        require(accumulatedFees > 0, "No fees to withdraw");
        uint256 amount = accumulatedFees;
        accumulatedFees = 0;

        (bool success, ) = payable(treasuryAddress).call{value: amount}("");
        require(success, "Fee withdrawal failed");
    }
}
