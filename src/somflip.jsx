import './somflip.css';
import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import somniaLogo from './somnia-logo-light.svg'; // Somnia logosunu içe aktar

import headsImage from './heads.png';
import tailsImage from './tails.png';
import spinningImage from './flip.gif';

const contractAddress = "0x014f851965f281d6112fc7f6dfe8c331c413eb9b";
const contractABI = [
  "function flipCoin(string memory _choice) external payable",
  "event FlipResult(address indexed player, uint256 betAmount, string choice, string result, uint256 payout)"
];


const SomFlip = () => {
  const [selectedSide, setSelectedSide] = useState('Heads');
  const [betAmount, setBetAmount] = useState('0.05');
  const [account, setAccount] = useState(null);
  const [provider, setProvider] = useState(null);
  const [contract, setContract] = useState(null);
  const [flipResult, setFlipResult] = useState(null);
  const [coinImage, setCoinImage] = useState(tailsImage);
  const [totalWin, setTotalWin] = useState(0);
  const [totalLoss, setTotalLoss] = useState(0);
  const [balance, setBalance] = useState(null); 

  useEffect(() => {
    setCoinImage(selectedSide === "Heads" ? headsImage : tailsImage);
  }, [selectedSide]);

  useEffect(() => {
    if (window.ethereum) {
      const web3Provider = new ethers.BrowserProvider(window.ethereum);
      setProvider(web3Provider);
    }
  }, []);


  useEffect(() => {
    const fetchBalance = async () => {
      if (account && provider) {
        const balance = await provider.getBalance(account);
        setBalance(ethers.formatEther(balance));
      }
    };

    fetchBalance();
  }, [account, provider]);

  useEffect(() => {
    if (!contract) return;
  
    const handleFlipResult = (player, betAmount, choice, result, payout, event) => {
      console.log("FlipResult Event:", { player, betAmount, choice, result, payout, event });
  
      setFlipResult({
        player,
        betAmount: ethers.formatEther(betAmount),
        choice,
        result,
        payout: ethers.formatEther(payout),
      });
  
      setCoinImage(result === "Heads" ? headsImage : tailsImage);
    };
  
    contract.on("FlipResult", handleFlipResult);
  
    return () => {
      contract.off("FlipResult", handleFlipResult);
    };
  }, [contract]);
  

  const connectWallet = async () => {
    if (!provider) return alert("Metamask not found");
    const signer = await provider.getSigner();
    const address = await signer.getAddress();
    setAccount(address);
    setContract(new ethers.Contract(contractAddress, contractABI, signer));


    const balance = await provider.getBalance(address);
    setBalance(ethers.formatEther(balance));
  };

  const disconnectWallet = () => {
    setAccount(null);
    setContract(null);
    setBalance(null); 
  };

  const SOMNIA_TESTNET_ID = 50312;
  const SOMNIA_RPC_URL = "https://dream-rpc.somnia.network";

  const switchToSomnia = async () => {
    if (!window.ethereum) {
      alert("Metamask not found");
      return false;
    }

    try {
      const currentChainId = await window.ethereum.request({ method: 'eth_chainId' });
      if (parseInt(currentChainId, 16) !== SOMNIA_TESTNET_ID) {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: ethers.toBeHex(SOMNIA_TESTNET_ID) }],
        });

        const newProvider = new ethers.BrowserProvider(window.ethereum);
        setProvider(newProvider);
        const signer = await newProvider.getSigner();
        setContract(new ethers.Contract(contractAddress, contractABI, signer));
      }
      return true;
    } catch (error) {
      if (error.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: ethers.toBeHex(SOMNIA_TESTNET_ID),
              chainName: "Somnia Testnet",
              nativeCurrency: { name: "Ether", symbol: "STT", decimals: 18 },
              rpcUrls: [SOMNIA_RPC_URL],
              blockExplorerUrls: ["https://shannon-explorer.somnia.network"],
            }]
          });

          const newProvider = new ethers.BrowserProvider(window.ethereum);
          setProvider(newProvider);
          const signer = await newProvider.getSigner();
          setContract(new ethers.Contract(contractAddress, contractABI, signer));

          return true;
        } catch (addError) {
          console.error("Failed to add Somnia Testnet:", addError);
          return false;
        }
      } else {
        console.error("Failed to switch network:", error);
        return false;
      }
    }
  };

  const [flipResults, setFlipResults] = useState([]); 

  const handleFlip = async () => {
    if (!contract) return alert("Connect your wallet first");
  
    const switched = await switchToSomnia();
    if (!switched) return;
  
    setIsFlipping(true);
    setFlipResult(null);
    setCoinImage(spinningImage);
  
    try {
      const tx = await contract.flipCoin(selectedSide, { value: ethers.parseEther(betAmount) });
      console.log("Transaction Hash:", tx.hash); 
  
      const receipt = await tx.wait();  
  
      console.log("Flip Transaction Receipt:", receipt);
      console.log("Transaction Logs:", receipt.logs); 
  
      receipt.logs.forEach((log) => {
        try {
          const parsedLog = contract.interface.parseLog(log);
          console.log("✅ FlipResult Event Verisi:", parsedLog);
  
        
          const player = parsedLog.args[0];  
          const betAmount = ethers.formatEther(parsedLog.args[1]);  
          const choice = parsedLog.args[2];  
          const result = parsedLog.args[3];  
          const payout = ethers.formatEther(parsedLog.args[4]);  
  
          
          setFlipResults(prevResults => [
            {
              player,
              betAmount,
              choice,
              result,
              payout,
              txHash: tx.hash,
            },
            ...prevResults
          ]);
  
          setFlipResult({
            player,
            betAmount,
            choice,
            result,
            payout,
            txHash: tx.hash, 
          });
  
          setCoinImage(result === "Heads" ? headsImage : tailsImage);


          if (parseFloat(payout) > 0) {
            setTotalWin((prevWin) => prevWin + parseFloat(payout));
          } else {
            setTotalLoss((prevLoss) => prevLoss + parseFloat(betAmount)); 
          }

        } catch (error) {
          console.error("⛔ Log parse edilemedi:", error);
        }
      });
    } catch (error) {
      alert("Transaction failed: " + error.message);
      setIsFlipping(false);
    }
  };


  return (
    <div className="somflip-container">
      <div className="somnia-logo-container">
        <img src={somniaLogo} alt="Somnia Logo" className="somnia-logo" />
      </div>

      <h2 className="header">Somnia Flip Game</h2>
      {account ? (
        <div className="wallet-info">
          <p className="account-info"><b>Connected:</b> {account}</p>
          <p className="balance-info">
  <b>Balance:</b> {balance ? `${parseFloat(balance).toFixed(4)} STT` : "Loading..."}
</p>
          <button className="disconnect-wallet" onClick={disconnectWallet}>Disconnect</button>
        </div>
      ) : (
        <button className="connect-wallet" onClick={connectWallet}>Connect Wallet</button>
      )}

      <div className="coin-container">
        <img src={coinImage} alt="Coin" className="coin-image" />
      </div>

      <div className="coin-selection">
        <button className={`side-btn ${selectedSide === 'Heads' ? 'active' : ''}`} onClick={() => setSelectedSide('Heads')}>Heads</button>
        <button className={`side-btn ${selectedSide === 'Tails' ? 'active' : ''}`} onClick={() => setSelectedSide('Tails')}>Tails</button>
      </div>

      <div className="bet-selection">
        {["0.01", "0.05", "0.1", "0.25", "0.5", "1"].map((amount) => (
          <button key={amount} className={`bet-btn ${betAmount === amount ? 'active' : ''}`} onClick={() => setBetAmount(amount)}>
            {amount} STT
          </button>
        ))}
      </div>

      <button className="flip-btn" onClick={handleFlip}>Flip!</button>

      {flipResult && (
        <div className="result-container">
          <h3><b>Result:</b></h3>
          <p><b>Your choice:</b> {flipResult.choice}</p>
          <p><b>Result:</b> {flipResult.result}</p>
          <p><b>Transaction:</b> <a 
          href={`https://shannon-explorer.somnia.network/tx/${flipResult.txHash}`} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="view-tx"
        >
          View
        </a></p>
          <p className={flipResult.payout > 0 ? "win-text" : "lose-text"}>{flipResult.payout > 0 ? `You won: ${flipResult.payout} STT` : "You lost!"}</p>
        </div>
      )}

<div className="last-flips-container">
  <h3>Last Flips</h3>
  <ul>
    {flipResults.slice(0, 5).map((flip, index) => ( 
      <li key={index}>
        <span><b>Choice:</b> {flip.choice}</span> | 
        <span><b> Result:</b> {flip.result}</span> | 
        <span><b> Bet:</b> {flip.betAmount} STT</span> | 
        <span className={flip.payout > 0 ? "win-text" : "lose-text"}>
          {flip.payout > 0 ? ` Won: ${flip.payout} STT` : ` Lost: ${flip.betAmount} STT`}
        </span>
        {flip.txHash ? (
          <a 
            href={`https://shannon-explorer.somnia.network/tx/${flip.txHash}`} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="view-tx"
          >
            View
          </a>
        ) : (
          <span className="no-tx">No TX</span> 
        )}
      </li>
    ))}
  </ul>
</div>

      <div className="somnia-logo-container">
        <img src={somniaLogo} alt="Somnia Logo" className="somnia-logo" />
      </div>

      <div className="stats-container">
        <h3>Stats</h3>
        <p>Total Won: {totalWin.toFixed(2)} STT</p>
        <p>Total Lost: {totalLoss.toFixed(2)} STT</p>
      </div>
    </div>
  );
};

export default SomFlip;