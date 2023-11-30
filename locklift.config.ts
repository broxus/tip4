import { LockliftConfig } from "locklift";
import { FactorySource } from "./build/factorySource";
import * as dotenv from "dotenv";
dotenv.config();

declare global {
  const locklift: import("locklift").Locklift<FactorySource>;
}

const config: LockliftConfig = {
  compiler: {
    version: "0.62.0",
    externalContractsArtifacts: {
      precompiled: ["Index", "IndexBasis"],
    }
  },
  linker: { version: "0.15.48" },
  networks: {
    locklift: {
      connection: {
        id: 123,
        type: "proxy",
        data: { connectionFactory: undefined as any },
      },
      giver: {
        address: process.env.LOCAL_GIVER_ADDRESS ?? "",
        key: process.env.LOCAL_GIVER_KEY ?? "",
      },
      keys: { amount: 20 },
    },
    local: {
      connection: {
        id: 1,
        group: "localnet",
        type: "graphql",
        data: {
          endpoints: [process.env.LOCAL_NETWORK_ENDPOINT ?? ""],
          latencyDetectionInterval: 1000,
          local: true,
        },
      },
      giver: {
        address: process.env.LOCAL_GIVER_ADDRESS ?? "",
        key: process.env.LOCAL_GIVER_KEY ?? "",
      },
      keys: {
        phrase: process.env.LOCAL_PHRASE,
        amount: 20,
      },
    },
    test: {
      connection: {
        id: 1,
        type: "graphql",
        group: "dev",
        data: {
          endpoints: [process.env.DEVNET_NETWORK_ENDPOINT ?? ""],
          latencyDetectionInterval: 1000,
          local: false,
        },
      },
      giver: {
        address: process.env.DEVNET_GIVER_ADDRESS ?? "",
        key: process.env.DEVNET_GIVER_KEY ?? "",
      },
      keys: {
        phrase: process.env.DEVNET_PHRASE,
        amount: 20,
      },
    },
    venom_testnet: {
      connection: {
        id: 1000,
        type: "jrpc",
        group: "dev",
        data: {
          endpoint: process.env.VENOM_TESTNET_RPC_NETWORK_ENDPOINT ?? "",
        },
      },
      giver: {
        address: process.env.VENOM_TESTNET_GIVER_ADDRESS ?? "",
        phrase: process.env.VENOM_TESTNET_GIVER_PHRASE ?? "",
        accountId: 0,
      },
      keys: {
        phrase: process.env.VENOM_TESTNET_PHRASE,
        amount: 20,
      },
    },
    main: {
      connection: {
        id: 1,
        type: "graphql",
        group: "main",
        data: {
          endpoints: [process.env.MAINNET_NETWORK_ENDPOINT ?? ""],
          latencyDetectionInterval: 1000,
          local: false,
        },
      },
      giver: {
        address: process.env.MAINNET_GIVER_ADDRESS ?? "",
        key: process.env.MAINNET_GIVER_KEY ?? "",
      },
      keys: {
        phrase: process.env.MAINNET_PHRASE,
        amount: 20,
      },
    },
  },
  mocha: { timeout: 2000000 },
};

export default config;
