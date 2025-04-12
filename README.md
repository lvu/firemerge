# Firefly transaction merger

## Rationale

I really like the [Firefly III](https://firefly-iii.org/) personal finance manager, but
entring my transactions is always a PITA. [Waterfly III](https://github.com/dreautall/waterfly-iii) simplifies
this process a lot, but it has its pitfalls:
* it misses transactions sometimes;
* it doesn't store the notifications, so if you accidentally swipe them out or reboot your phone, you lose them;
* if there's more than 10 unprocessed notifications, the earlier ones get lost too.

Plus, I always wanted to have an ability to load the data (description, account and category) from the latest similar
transation; some transactions, like buying food in my local supermarket, are occuring frequently, and it just bugs me to
enter these details manually, even with all the autocompletes. Using Firefly III rules isn't ideal either, as I'd like to
have this info when entering the transaction, to be able to correct it if needed.

## My use-case

Matters get more complicated, as my bank ([Raiffeisen Ukraine](https://raiffeisen.ua/)) doesn't provide any API to get the bank statement; all it has currently is an ability to export a statement it a PDF(!) format.

The project is rather bank-specific, especially the merging part, but it could probably be customized if needed.

In general, you probably won't be able to use this project as is unless your use-case is nearly the same as mine.

## Usage

If you decided to try it out anyway, first install the project, preferrably in a Python virtualenv:

    git clone https://github.com/lvu/firemerge.git
    cd firemerge
    python -m venv venv
    . ./venv/bin/activate
    pip install -e .

To configure the merger, create a file named `.env` in the project dir and write there:

    FIREFLY_BASE_URL=<https://my-firefly-installation.my-domain/>
    FIREFLY_TOKEN=<MY.FIREFLY.PERSONAL.ACCESS.TOKEN>

Now, download your bank's statement and run the merger, feeding the statement file to it:

    firemerge statement.pdf

Go to http://127.0.0.1:8080/ in your regular browser, select the account to merge the statement into and have fun :)

> [!CAUTION]
> This web app is intended to be used locally; do not deploy it on the web! The frontend communicates with the backend without any kind
> of authentication!