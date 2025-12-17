const { ethers } = require("ethers");
const solc = require("solc");
const fs = require("fs");
const path = require("path");

// Load OpenZeppelin contracts from node_modules
function findImport(importPath) {
  const basePath = path.resolve(__dirname, "..");
  
  // Handle @openzeppelin imports
  if (importPath.startsWith("@openzeppelin/")) {
    const ozPath = path.join(basePath, "node_modules", importPath);
    if (fs.existsSync(ozPath)) {
      return { contents: fs.readFileSync(ozPath, "utf8") };
    }
  }
  
  // Handle local imports
  const localPath = path.join(basePath, "contracts", importPath);
  if (fs.existsSync(localPath)) {
    return { contents: fs.readFileSync(localPath, "utf8") };
  }
  
  return { error: `File not found: ${importPath}` };
}

async function compile() {
  console.log("Compiling contracts...");
  
  const basePath = path.resolve(__dirname, "..");
  
  // Read contract sources
  const forwarderSource = fs.readFileSync(path.join(basePath, "contracts/DLCForwarder.sol"), "utf8");
  const gatewaySource = fs.readFileSync(path.join(basePath, "contracts/DLCGateway.sol"), "utf8");
  const settlementSource = fs.readFileSync(path.join(basePath, "contracts/DLCSettlement.sol"), "utf8");
  
  const input = {
    language: "Solidity",
    sources: {
      "DLCForwarder.sol": { content: forwarderSource },
      "DLCGateway.sol": { content: gatewaySource },
      "DLCSettlement.sol": { content: settlementSource },
    },
    settings: {
      optimizer: { enabled: true, runs: 200 },
      outputSelection: {
        "*": {
          "*": ["abi", "evm.bytecode.object"],
        },
      },
    },
  };
  
  const output = JSON.parse(
    solc.compile(JSON.stringify(input), { import: findImport })
  );
  
  if (output.errors) {
    const errors = output.errors.filter(e => e.severity === "error");
    if (errors.length > 0) {
      console.error("Compilation errors:");
      errors.forEach(e => console.error(e.formattedMessage));
      throw new Error("Compilation failed");
    }
  }
  
  return output.contracts;
}

async function main() {
  console.log("=".repeat(60));
  console.log("MASOWE DLC CONTRACT DEPLOYMENT");
  console.log("Identity: MKEY-MNM-TAC-001-2024");
  console.log("=".repeat(60));

  const POLYGON_RPC_URL = process.env.POLYGON_RPC_URL;
  const DEPLOYER_PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY;

  if (!POLYGON_RPC_URL || !DEPLOYER_PRIVATE_KEY) {
    throw new Error("Missing POLYGON_RPC_URL or DEPLOYER_PRIVATE_KEY");
  }

  // Connect to Polygon
  const provider = new ethers.JsonRpcProvider(POLYGON_RPC_URL);
  const wallet = new ethers.Wallet(DEPLOYER_PRIVATE_KEY, provider);
  
  console.log(`\nDeployer: ${wallet.address}`);
  
  const balance = await provider.getBalance(wallet.address);
  console.log(`Balance: ${ethers.formatEther(balance)} MATIC`);
  
  if (balance < ethers.parseEther("0.01")) {
    throw new Error("Need at least 0.01 MATIC for deployment");
  }

  const network = await provider.getNetwork();
  console.log(`Network: Chain ID ${network.chainId}`);

  // Compile contracts
  const contracts = await compile();
  
  const deployedAddresses = {};

  // Deploy DLCForwarder
  console.log("\n[1/3] Deploying DLCForwarder...");
  const forwarderAbi = contracts["DLCForwarder.sol"].DLCForwarder.abi;
  const forwarderBytecode = "0x" + contracts["DLCForwarder.sol"].DLCForwarder.evm.bytecode.object;
  
  const ForwarderFactory = new ethers.ContractFactory(forwarderAbi, forwarderBytecode, wallet);
  const forwarder = await ForwarderFactory.deploy("MASOWE DLC Forwarder");
  await forwarder.waitForDeployment();
  const forwarderAddress = await forwarder.getAddress();
  console.log(`   Forwarder: ${forwarderAddress}`);
  deployedAddresses.forwarder = forwarderAddress;

  // Deploy DLCGateway
  console.log("\n[2/3] Deploying DLCGateway...");
  const gatewayAbi = contracts["DLCGateway.sol"].DLCGateway.abi;
  const gatewayBytecode = "0x" + contracts["DLCGateway.sol"].DLCGateway.evm.bytecode.object;
  
  const GatewayFactory = new ethers.ContractFactory(gatewayAbi, gatewayBytecode, wallet);
  const gateway = await GatewayFactory.deploy(forwarderAddress, wallet.address);
  await gateway.waitForDeployment();
  const gatewayAddress = await gateway.getAddress();
  console.log(`   Gateway: ${gatewayAddress}`);
  deployedAddresses.gateway = gatewayAddress;

  // Deploy DLCSettlement
  console.log("\n[3/3] Deploying DLCSettlement...");
  const settlementAbi = contracts["DLCSettlement.sol"].DLCSettlement.abi;
  const settlementBytecode = "0x" + contracts["DLCSettlement.sol"].DLCSettlement.evm.bytecode.object;
  
  const SettlementFactory = new ethers.ContractFactory(settlementAbi, settlementBytecode, wallet);
  const settlement = await SettlementFactory.deploy(gatewayAddress);
  await settlement.waitForDeployment();
  const settlementAddress = await settlement.getAddress();
  console.log(`   Settlement: ${settlementAddress}`);
  deployedAddresses.settlement = settlementAddress;

  // Link Gateway to Settlement
  console.log("\n[4/4] Linking Gateway to Settlement...");
  const gatewayContract = new ethers.Contract(gatewayAddress, gatewayAbi, wallet);
  const tx = await gatewayContract.setSettlementContract(settlementAddress);
  await tx.wait();
  console.log("   Linked successfully");

  // Save deployment
  const deployment = {
    chainId: Number(network.chainId),
    deployer: wallet.address,
    timestamp: new Date().toISOString(),
    contracts: deployedAddresses,
    genesisKey: "MKEY-MNM-TAC-001-2024"
  };
  
  fs.writeFileSync("./deployment.json", JSON.stringify(deployment, null, 2));

  console.log("\n" + "=".repeat(60));
  console.log("DEPLOYMENT COMPLETE");
  console.log("=".repeat(60));
  console.log(`\nForwarder:  ${forwarderAddress}`);
  console.log(`Gateway:    ${gatewayAddress}`);
  console.log(`Settlement: ${settlementAddress}`);
  
  return deployment;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  });
