const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("=".repeat(60));
  console.log("MASOWE DLC CONTRACT DEPLOYMENT");
  console.log("Identity: MKEY-MNM-TAC-001-2024");
  console.log("=".repeat(60));

  // Check environment
  const POLYGON_RPC_URL = process.env.POLYGON_RPC_URL;
  const DEPLOYER_PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY;

  if (!POLYGON_RPC_URL || !DEPLOYER_PRIVATE_KEY) {
    throw new Error("Missing POLYGON_RPC_URL or DEPLOYER_PRIVATE_KEY");
  }

  // Connect to Polygon
  const provider = new ethers.JsonRpcProvider(POLYGON_RPC_URL);
  const wallet = new ethers.Wallet(DEPLOYER_PRIVATE_KEY, provider);
  
  console.log(`\nDeployer address: ${wallet.address}`);
  
  // Check balance
  const balance = await provider.getBalance(wallet.address);
  console.log(`Deployer balance: ${ethers.formatEther(balance)} MATIC`);
  
  if (balance < ethers.parseEther("0.01")) {
    throw new Error("Insufficient MATIC balance for deployment (need at least 0.01 MATIC)");
  }

  // Get network info
  const network = await provider.getNetwork();
  console.log(`Network: ${network.name} (chainId: ${network.chainId})`);

  // Load compiled contracts
  const forwarderArtifact = JSON.parse(
    fs.readFileSync("./artifacts/contracts/DLCForwarder.sol/DLCForwarder.json", "utf8")
  );
  const gatewayArtifact = JSON.parse(
    fs.readFileSync("./artifacts/contracts/DLCGateway.sol/DLCGateway.json", "utf8")
  );
  const settlementArtifact = JSON.parse(
    fs.readFileSync("./artifacts/contracts/DLCSettlement.sol/DLCSettlement.json", "utf8")
  );

  const deployedAddresses = {};

  // 1. Deploy DLCForwarder
  console.log("\n[1/3] Deploying DLCForwarder...");
  const ForwarderFactory = new ethers.ContractFactory(
    forwarderArtifact.abi,
    forwarderArtifact.bytecode,
    wallet
  );
  const forwarder = await ForwarderFactory.deploy("MASOWE DLC Forwarder");
  await forwarder.waitForDeployment();
  const forwarderAddress = await forwarder.getAddress();
  console.log(`   DLCForwarder deployed: ${forwarderAddress}`);
  deployedAddresses.forwarder = forwarderAddress;

  // 2. Deploy DLCGateway
  console.log("\n[2/3] Deploying DLCGateway...");
  const GatewayFactory = new ethers.ContractFactory(
    gatewayArtifact.abi,
    gatewayArtifact.bytecode,
    wallet
  );
  const gateway = await GatewayFactory.deploy(forwarderAddress, wallet.address);
  await gateway.waitForDeployment();
  const gatewayAddress = await gateway.getAddress();
  console.log(`   DLCGateway deployed: ${gatewayAddress}`);
  deployedAddresses.gateway = gatewayAddress;

  // 3. Deploy DLCSettlement
  console.log("\n[3/3] Deploying DLCSettlement...");
  const SettlementFactory = new ethers.ContractFactory(
    settlementArtifact.abi,
    settlementArtifact.bytecode,
    wallet
  );
  const settlement = await SettlementFactory.deploy(gatewayAddress);
  await settlement.waitForDeployment();
  const settlementAddress = await settlement.getAddress();
  console.log(`   DLCSettlement deployed: ${settlementAddress}`);
  deployedAddresses.settlement = settlementAddress;

  // 4. Link Gateway to Settlement
  console.log("\n[4/4] Linking Gateway to Settlement...");
  const gatewayContract = new ethers.Contract(gatewayAddress, gatewayArtifact.abi, wallet);
  const linkTx = await gatewayContract.setSettlementContract(settlementAddress);
  await linkTx.wait();
  console.log("   Gateway linked to Settlement");

  // Save deployment info
  const deploymentInfo = {
    network: network.name,
    chainId: Number(network.chainId),
    deployer: wallet.address,
    timestamp: new Date().toISOString(),
    contracts: deployedAddresses,
    genesisKey: "MKEY-MNM-TAC-001-2024"
  };

  fs.writeFileSync(
    "./deployment.json",
    JSON.stringify(deploymentInfo, null, 2)
  );

  console.log("\n" + "=".repeat(60));
  console.log("DEPLOYMENT COMPLETE");
  console.log("=".repeat(60));
  console.log(`\nForwarder: ${forwarderAddress}`);
  console.log(`Gateway:   ${gatewayAddress}`);
  console.log(`Settlement: ${settlementAddress}`);
  console.log("\nDeployment info saved to deployment.json");
  console.log("\nSet these environment variables:");
  console.log(`DLC_FORWARDER_ADDRESS=${forwarderAddress}`);
  console.log(`DLC_GATEWAY_ADDRESS=${gatewayAddress}`);
  console.log(`DLC_SETTLEMENT_ADDRESS=${settlementAddress}`);
  console.log(`DLC_CHAIN_ID=137`);
  console.log(`RELAYER_PRIVATE_KEY=<same as deployer or new funded wallet>`);

  return deployedAddresses;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
