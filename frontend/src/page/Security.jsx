import { useState, useEffect } from "react";

const Security = () => {
  const [recipientAddress, setRecipientAddress] = useState("");
  const [message, setMessage] = useState("");
  const [encryptedData, setEncryptedData] = useState("");
  const [error, setError] = useState(null);
  const [connectedAccount, setConnectedAccount] = useState("");

  useEffect(() => {
    // Auto-detect the connected MetaMask account
    const fetchAccount = async () => {
      if (window.ethereum) {
        const accounts = await window.ethereum.request({ method: "eth_accounts" });
        if (accounts.length > 0) {
          setConnectedAccount(accounts[0]);
        }
      }
    };
    fetchAccount();
  }, []);

  const encryptMessage = async () => {
    setError(null);

    if (!window.ethereum) {
      setError("MetaMask is required to encrypt messages");
      return;
    }

    try {
      const accounts = await window.ethereum.request({ method: "eth_accounts" });
      if (accounts.length === 0) {
        setError("No MetaMask account connected.");
        return;
      }

      // Use the connected MetaMask account if no recipient is entered
      const recipient = recipientAddress || accounts[0];

      // Ensure recipient is valid
      if (!/^0x[a-fA-F0-9]{40}$/.test(recipient)) {
        setError("Invalid Ethereum address");
        return;
      }

      // Request permission explicitly
      await window.ethereum.request({
        method: "wallet_requestPermissions",
        params: [{ eth_encryptionPublicKey: {} }],
      });

      // Get the encryption public key
      const publicKey = await window.ethereum.request({
        method: "eth_getEncryptionPublicKey",
        params: [recipient],
      });

      console.log("Public Key:", publicKey);
      setEncryptedData(`Encryption successful! Public Key: ${publicKey}`);

    } catch (err) {
      setError(err.message || "Encryption failed");
      console.error("Error:", err);
    }
  };

  return (
    <div className="max-w-md mx-auto p-4 bg-gray-100 rounded-lg">
      <h2 className="text-xl font-bold mb-4">Secure Message Encryption</h2>

      <div className="mb-4">
        <label className="block mb-2">Recipient Address</label>
        <input
          type="text"
          placeholder={connectedAccount || "0x..."}
          value={recipientAddress}
          onChange={(e) => setRecipientAddress(e.target.value)}
          className="w-full px-3 py-2 border rounded"
        />
      </div>

      <div className="mb-4">
        <label className="block mb-2">Message</label>
        <textarea
          placeholder="Enter your message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="w-full px-3 py-2 border rounded"
          rows={4}
        />
      </div>

      <button
        onClick={encryptMessage}
        className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600"
      >
        Encrypt Message
      </button>

      {error && (
        <div className="mt-4 text-red-500 bg-red-100 p-2 rounded">
          {error}
        </div>
      )}

      {encryptedData && (
        <div className="mt-4">
          <h3 className="font-bold">Encrypted Data:</h3>
          <textarea
            readOnly
            value={encryptedData}
            className="w-full mt-2 p-2 bg-gray-200 rounded"
            rows={4}
          />
        </div>
      )}
    </div>
  );
};

export default Security;
