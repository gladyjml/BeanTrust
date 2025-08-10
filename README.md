# BeanTrust

A blockchain-powered platform to track artisanal coffee from farm to cup, ensuring transparency in sourcing and fair trade payments to growers via tokenized transactions.

---

## Overview

BeanTrust leverages the Stacks blockchain and Clarity smart contracts to create a decentralized, transparent system for tracking artisanal coffee supply chains and ensuring fair payments to farmers. By tokenizing coffee batches and automating payments, it empowers growers, roasters, and consumers while guaranteeing ethical sourcing.

The platform consists of four main smart contracts:

1. **Coffee Batch NFT Contract** – Tracks coffee batches as NFTs, storing origin and processing data.
2. **FairTrade Token Contract** – Manages tokenized payments to farmers and supply chain participants.
3. **Supply Chain Tracking Contract** – Records each step of the coffee’s journey, from farm to retailer.
4. **Payment Escrow Contract** – Automates fair trade payments with dispute resolution mechanisms.

---

## Features

- **Immutable Batch Tracking**: Each coffee batch is an NFT with metadata on origin, certifications, and processing.
- **Fair Trade Payments**: Farmers receive tokenized payments automatically upon delivery verification.
- **Transparent Supply Chain**: Consumers scan QR codes to view a batch’s journey on-chain.
- **Automated Escrow**: Smart contracts hold funds until quality and delivery are verified.
- **Decentralized Governance**: Stakeholders (farmers, roasters) vote on payment terms via token-weighted proposals.

---

## Smart Contracts

### Coffee Batch NFT Contract
- Mints NFTs for each coffee batch, embedding metadata (farm, harvest date, certifications).
- Transfers NFTs along the supply chain (farmer → processor → roaster → retailer).
- Publicly queryable metadata for consumer transparency.

### FairTrade Token Contract
- Issues stablecoin-based tokens (pegged to USD) for payments.
- Staking mechanism for farmers to earn governance rights.
- Burns tokens after final distribution to prevent inflation.

### Supply Chain Tracking Contract
- Logs supply chain events (e.g., harvest, processing, shipping) as immutable records.
- Integrates with oracles for real-world data (e.g., shipment tracking).
- Verifies certifications (e.g., organic, fair trade) via trusted inputs.

### Payment Escrow Contract
- Holds tokens until batch delivery and quality are confirmed.
- Automates payouts to farmers and other stakeholders based on predefined splits.
- Includes dispute resolution with multi-sig arbitration.

---

## Installation

1. Install [Clarinet CLI](https://docs.hiro.so/clarinet/getting-started) for Stacks development.
2. Clone this repository:
   ```bash
   git clone https://github.com/yourusername/beantrust.git
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Run tests:
   ```bash
   clarinet test
   ```
5. Deploy contracts to Stacks testnet:
   ```bash
   clarinet deploy
   ```

---

## Usage

- **Farmers**: Register batches via the Coffee Batch NFT Contract, inputting origin and certification data.
- **Processors/Roasters**: Update supply chain events in the Supply Chain Tracking Contract.
- **Retailers**: Receive NFTs and verify batch authenticity; trigger payments via the Payment Escrow Contract.
- **Consumers**: Scan QR codes to view batch details on-chain.
- **Governance**: Stakeholders use FairTrade Tokens to vote on platform rules (e.g., escrow terms).

Refer to individual contract documentation for detailed function calls and parameters.

---

## Example Workflow

1. A farmer mints an NFT for a coffee batch, logging origin and organic certification.
2. The Supply Chain Tracking Contract records processing and shipping events, verified by oracles.
3. A roaster purchases the batch, transferring tokens to the Payment Escrow Contract.
4. Upon delivery and quality verification, the escrow releases tokens to the farmer and processor.
5. Consumers scan a QR code on the coffee package to view the batch’s journey and certifications.

---

## License

MIT License
