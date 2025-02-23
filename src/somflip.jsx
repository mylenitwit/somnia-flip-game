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

const SOMNIA_TESTNET_ID = 50312;
const SOMNIA_RPC_URL = "https://dream-rpc.somnia.network";

const SomFlip = () => {
  const [selectedSide, setSelectedSide] = useState('Heads');
  const [betAmount, setBetAmount] = useState('0.05');
  const [account, setAccount] = useState(null);
  const [provider, setProvider] = useState(null);
  const [contract, setContract] = useState(null);
  const [flipResult, setFlipResult] = useState(null);
  const [isFlipping, setIsFlipping] = useState(false);
  const [coinImage, setCoinImage] = useState(tailsImage);
  const [lastFlips, setLastFlips] = useState([]);
  const [totalWin, setTotalWin] = useState(0);
  const [totalLoss, setTotalLoss] = useState(0);
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
    if (contract) {
      contract.on("FlipResult", (player, betAmount, choice, result, payout) => {
        setIsFlipping(false);
        setFlipResult({ player, betAmount, choice, result, payout });
  
        // Coin'in görselini belirle
        setCoinImage(result === 'Heads' ? headsImage : tailsImage);
  
        // BigNumber'dan Ether'e çevir
        const payoutInEther = ethers.formatEther(payout);
        const betAmountInEther = ethers.formatEther(betAmount);
  
        // Sonuçları kaydet
        setLastFlips(prevFlips => [
          { 
            choice, 
            result, 
            payout: parseFloat(payoutInEther).toFixed(2), // Sayıya çevir
            bet: parseFloat(betAmountInEther).toFixed(2)  // Sayıya çevir
          },
          ...prevFlips.slice(0, 4)
        ]);
  
        // Kazanılan miktarı ekle
        if (payout > 0) {
          setTotalWin(prev => prev + parseFloat(payoutInEther)); // Sayıya çevir
        } else {
          setTotalLoss(prev => prev + parseFloat(betAmountInEther)); // Sayıya çevir
        }
  
        setTimeout(() => {
          setFlipResult(null);
        }, 10000);
      });
    }
  
    return () => {
      if (contract) {
        contract.removeAllListeners("FlipResult");
      }
    };
  }, [contract]);
  

  const connectWallet = async () => {
    if (!provider) return alert("Metamask not found");
    const signer = await provider.getSigner();
    setAccount(await signer.getAddress());
    setContract(new ethers.Contract(contractAddress, contractABI, signer));
  };

  const disconnectWallet = () => {
    setAccount(null);
    setContract(null);
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
  
        // Ağ değiştiği için provider'ı ve contract'ı yeniden oluştur
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
              blockExplorerUrls: ["https://somnia-devnet.socialscan.io"],
            }]
          });
  
          // Ağ eklendiğinde de provider'ı yeniden oluştur
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
  

  const handleFlip = async () => {
    if (!contract) return alert("Connect your wallet first");

    const switched = await switchToSomnia();
    if (!switched) return;

    setIsFlipping(true);
    setFlipResult(null);
    setCoinImage(spinningImage);

    try {
      const tx = await contract.flipCoin(selectedSide, { value: ethers.parseEther(betAmount) });
      await tx.wait();
    } catch (error) {
      alert("Transaction failed: " + error.message);
      setIsFlipping(false);
    }
  };

  return (
    
    <div className="somflip-container">
    {/* Somnia Logo - Container'ın içi */}
    <div className="somnia-logo-container">
      <img src={somniaLogo} alt="Somnia Logo" className="somnia-logo" />
    </div>

      <h2 className="header">Somnia Flip Game</h2>
      {account ? (
        <div className="wallet-info">
          <p className="account-info">Connected: {account}</p>
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
          <p><b>Player:</b> {flipResult.player}</p>
          <p><b>Your choice:</b> {flipResult.choice}</p>
          <p><b>Result:</b> {flipResult.result}</p>
          <p className={flipResult.payout > 0 ? "win-text" : "lose-text"}>{flipResult.payout > 0 ? `You won: ${flipResult.payout} STT` : "You lost!"}</p>
        </div>
      )}

      <div className="last-flips-container">
        <h3>Last Flips</h3>
        <ul>
          {lastFlips.map((flip, index) => (
            <li key={index}>
              <span><b>Choice:</b> {flip.choice}</span> | <span><b>Result:</b> {flip.result}</span> | 
              <span> <b>Bet:</b> {flip.bet} STT</span> | 
<span className={flip.payout > 0 ? "win-text" : "lose-text"}>
  {flip.payout > 0 
    ? ` Won: ${flip.payout} STT` 
    : ` Lost: ${flip.bet} STT`
  }
</span>
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
