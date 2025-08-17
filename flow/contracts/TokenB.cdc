import FungibleToken from 0x9a0766d93b6608b7

access(all) contract TokenB: FungibleToken {
    access(all) let totalSupply: UFix64
    access(all) var vaultMinter: @VaultMinter?

    access(all) resource Vault: FungibleToken.Vault {
        access(all) var balance: UFix64

        init(balance: UFix64) {
            self.balance = balance
        }

        access(all) fun deposit(from: @FungibleToken.Vault) {
            let vault <- from as! @TokenB.Vault
            self.balance = self.balance + vault.balance
            destroy vault
        }

        access(all) fun withdraw(amount: UFix64): @FungibleToken.Vault {
            if self.balance < amount {
                panic("Insufficient balance")
            }
            self.balance = self.balance - amount
            return <-create Vault(balance: amount)
        }
    }

    access(all) resource VaultMinter {
        access(all) fun mintTokens(amount: UFix64, recipient: &TokenB.Vault) {
            recipient.deposit(from: <-create Vault(balance: amount))
        }
    }

    access(all) fun createEmptyVault(): @FungibleToken.Vault {
        return <-create Vault(balance: 0.0)
    }

    init() {
        self.totalSupply = 500000.0
        self.vaultMinter <- create VaultMinter()
        let vault <- create Vault(balance: self.totalSupply)
        self.account.save(<-vault, to: /storage/tokenBVault)
        self.account.link<&TokenB.Vault>(/public/tokenBReceiver, target: /storage/tokenBVault)
    }
}
