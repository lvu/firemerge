# Firefly transaction merger

A customizable tool for semi-automated (not automated!) transaction entry for [Firefly III](https://firefly-iii.org/).

## Features
- Reads banking and credit card statements in CSV, XMLX and PDF (thanks to the excellent
  [pdfplumber](https://github.com/jsvine/pdfplumber) lib).
- Allows customization of the columns to parse the data from in these statements, on account-by-account basis.
- "Guesses" the most relevant past transactions to copy the metadata (title, cateory and account) from.
- Allows exporting a statetement for a specific account in a different format. This feature is quite limited,
  as it was made for some very specific use case.

## Mode of operation

Firemerge operates as a web-based interface that bridges the gap between your bank statements and Firefly III. Here's how it works:

### 1. **Statement Upload & Parsing**
- Upload your bank statements in CSV, XLSX, or PDF format
- The system uses configurable parsing rules to extract transaction data
- Each account can have its own parsing configuration to handle different statement formats

### 2. **Transaction Matching & Enrichment**
- Firemerge analyzes your uploaded transactions and "guesses" the most relevant past transactions
- It suggests metadata (description, category, account) based on similar historical transactions
- You can review and modify these suggestions before importing
- Firemerge also proposes you relevant transactions when you start entering a new description.

### 3. **Flexible Configuration**
- **Parser Settings**: Configure how to parse different statement formats for each account
  - Column mapping (date, amount, description, etc.)
  - File format settings (CSV encoding, separators, date formats)
  - Support for different statement structures
- **Export Settings**: Configure custom export formats for different transaction types
  - Define export fields for deposits, withdrawals, and transfers
  - Support for various field types (dates, amounts, constants, etc.)
- **Blacklist**: Filter out unwanted transactions based on description keywords

### 4. **Semi-Automated Workflow**
1. Upload your bank statement
2. Review the parsed transactions
3. Accept or modify the suggested metadata
4. Push the enriched transactions to Firefly III

### 5. **Similarity lookup**
- When a transaction is stored into Firefly III by Firemerge, a _Notes_ field is stored to it.
It contains values from the bank statement, labelled in the account's import config with _Notes Label_.
- When looking for similar transactions, it constructs the same _Notes_ field from a transaction,
and uses fuzzy search on existing transactions from the same account.

### 6. **Transaction states**
In the UI, when you upload a statement, you will see a list of cards for transaction in different states.
Those states are:
- **Matched:** a transaction with the same amount was found in Firefly III on the same date, and it has the same
  _Notes_ field; nothing is to be done about it.
- **Annotated:** a matching (see above) trnsaction was found, but its _Notes_ differ. You can save new _Notes_
  to it for it to be considered in further similarity lookups.
- **Unmatched:** transaction only exists in Firefly III, no corresponding transaction was found in the statement.
  This _could_ mean that you've entered it by mistake and you might want to delete it – do it in the Firefly III itself.
- **New**: The transaction is in the statement, but not in Firelfy III. If this transaction has exactly one
  similar candidate, you can save it right away; otherwise, you have to edit it, possbly picking on of the proposed
  candidates to copy the metadata from.

### 7. **Account-Specific Customization**
- Each Firefly III account can have its own parsing and export configuration
- Predefined configurations are available for some (currently, Ukraininan only) bank formats

The system is designed to be **semi-automated** - it provides intelligent suggestions but always requires human review before importing to ensure accuracy and prevent errors.

## Unsupported features
- Split transactions
- Tags
- Budgets
- Importig data into more than one account at a time

All of those could be implemented, they are just out of my use case. PRs are welcome.

## Rationale

I really like the [Firefly III](https://firefly-iii.org/) personal finance manager, but
entring my transactions is always a PITA. [Waterfly III](https://github.com/dreautall/waterfly-iii) simplifies
this process a lot, but it has its pitfalls:
- it misses transactions sometimes;
- it doesn't store the notifications, so if you accidentally swipe them out or reboot your phone, you lose them;
- if there's more than 10 unprocessed notifications, the earlier ones get lost too.

Plus, I always wanted to have an ability to load the data (description, account and category) from the latest similar
transation; some transactions, like buying food in my local supermarket, are occuring frequently, and it just bugs me to
enter these details manually, even with all the autocompletes. Using Firefly III rules isn't ideal either, as I'd like to
have this info when entering the transaction, to be able to correct it if needed.


## Installation


1. **Clone the repository:**
   ```bash
   git clone https://github.com/lvu/firemerge.git
   cd firemerge
   ```

2. **Create environment file:**
   ```bash
   cp env.example .env
   # Edit .env with your Firefly III credentials
   ```

3. **Run with Docker Compose:**

   Add the following to your _docker_compose.yml_, to the `services` section:
   ```
   firemerge:
     build: .
     ports:
       - "8080:8080"
     environment:
       - FIREFLY_BASE_URL=${FIREFLY_BASE_URL}
       - FIREFLY_TOKEN=${FIREFLY_TOKEN}
     restart: unless-stopped
     healthcheck:
       test: ["CMD", "curl", "-f", "http://localhost:8080/"]
       interval: 30s
       timeout: 10s
       retries: 3
       start_period: 40s
   ```

   Set up your reverse proxy accordingly, and run your `docker compose up -d`.


> [!CAUTION]
> The web app is intended to be used locally or in a secure environment; do not deploy it on the public web without proper authentication! The frontend communicates with the backend without any kind of authentication!

The intended way of using it is to put it behind [OAuth2 Proxy] (https://oauth2-proxy.github.io/oauth2-proxy/)
or something similar, to protect your financial data from being stolen or altered.