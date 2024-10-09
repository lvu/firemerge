import json
from datetime import datetime
from decimal import Decimal
from time import sleep

from selenium import webdriver
from selenium.common.exceptions import NoSuchElementException
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.wait import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC


CSS = By.CSS_SELECTOR


def main():
    chrome_options = Options()
    chrome_options.add_experimental_option("debuggerAddress", "127.0.0.1:9222")
    driver = webdriver.Chrome(options=chrome_options)
    driver.get("https://online.raiffeisen.ua/")

    """
    import IPython
    IPython.embed()
    return
    """

    wait_and_open_statement(driver)
    switch_to_english(driver)

    for row in gen_rows(driver):
        print(json.dumps(row, default=str))

    # closes = driver.find_elements(CSS, "a.actionClose")


def expect(driver, selector, by=CSS, timeout=10):
    return WebDriverWait(driver, timeout).until(
        EC.presence_of_element_located((by, selector))
    )


def wait_and_open_statement(driver: webdriver.Chrome):
    accounts_btn = expect(driver, "li.accounts > a", timeout=240)
    accounts_btn.click()
    statement_btn = expect(driver, "li.tab1 > a")
    statement_btn.click()
    expect(driver, "div.statementItem.clickWrapper")


def switch_to_english(driver: webdriver.Chrome):
    lang_div = expect(driver, "div.language.combobox")
    lang_div.click()
    eng_a = expect(driver, "//div[contains(@class, 'language')]//a[contains(text(), 'ENG')]", by=By.XPATH)
    eng_a.click()
    sleep(2)


def parse_meta(statement_div):
    meta = {}
    details_fs = statement_div.find_element(CSS, "fieldset.details")
    for row_div in details_fs.find_elements(CSS, "div.formRow"):
        label = row_div.find_element(CSS, "div.label label").text
        meta[label] = row_div.find_element(CSS, "div.formControl").text
    return meta


def parse_simple(statement_div):
    div_summary = statement_div.find_element(CSS, "div.summary")
    return {
        "name": div_summary.find_element(CSS, "span.name").text,
        "date": datetime.strptime(
            div_summary.find_element(CSS, "span.date").text,
            "%d.%m.%Y, %H:%M"
        ),
        "amount": Decimal(
            div_summary
                .find_element(CSS, "span.sum")
                .text
                .replace(",", ".")
                .replace(" ", "")
        ),
        "meta": parse_meta(statement_div),
    }


def parse_bank_transfer(statement_div):
    div_summary = statement_div.find_element(CSS, "div.summary")
    return {
        "name": div_summary.find_element(CSS, "div.name").text,
        "date": datetime.strptime(
            div_summary.find_element(CSS, "div.createDate").text,
            "%d.%m.%Y, %H:%M"
        ),
        "amount": Decimal(
            div_summary
                .find_element(CSS, "div.creditAmount span.sum")
                .text
                .replace(",", ".")
                .replace(" ", "")
        ),
        "fee": div_summary.find_element(CSS, "div.feeAmount").text,
        "meta": parse_meta(statement_div),
    }


def gen_rows(driver: webdriver.Chrome):
    for statement_ref_div in driver.find_elements(CSS, "div.statementItem.clickWrapper"):
        driver.execute_script("arguments[0].scrollIntoView(false);", statement_ref_div)
        statement_ref_div.click()
        statement_div = expect(driver, "div.modal-window")
        expect(driver, "div.modal-window div.summary", timeout=30)
        sleep(0.5)

        try:
            yield parse_simple(statement_div)
        except NoSuchElementException:
            yield

        close_a = statement_div.find_element(CSS, "a.modal-window-close.actionClose")
        close_a.click()


if __name__ == "__main__":
    main()