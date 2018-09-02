import React, { Component } from 'react';
import REST from './rest-client';

class Period extends Component {
  constructor(props) {
    super(props);
    const initialPrefix = props.prefix ? props.prefix : '';
    this.state = { label: props.label, prefix: initialPrefix, transactions: [] };
    this.handlePrefixChange = this.handlePrefixChange.bind(this);
    this.refreshAccounts = this.refreshAccounts.bind(this);
    this.refreshTransactions = this.refreshTransactions.bind(this);
    this.formatTransaction = this.formatTransaction.bind(this);
    this.refreshAccounts();
    this.refreshTransactions(initialPrefix);
  }

  render() {
    const rows = this.state.transactions.map(this.formatTransaction);
    const prefixLabel = this.state.prefix ? this.state.prefix + '*' : '???';
    return (
      <div className="Period">
        <h2 className="Period-title">{this.state.label} {prefixLabel}</h2>
        <form>
          <p><input type="text" onChange={this.handlePrefixChange}/></p>
        </form>
        <table>
          <colgroup>
            <col width="90px"/>
            <col width="1*"/>
            <col width="60px"/>
            <col width="180px"/>
            <col width="180px"/>
            <col width="45px"/>
            <col width="70px"/>
            <col width="130px"/>
            <col width="3*"/>
          </colgroup>
          <thead>
            <tr>
              <th>Datum</th>
              <th>Naam / Omschrijving</th>
              <th>Pot</th>
              <th>Rekening</th>
              <th>Tegenrekening</th>
              <th>Code</th>
              <th class="key_signedCents">Bedrag (EUR)</th>
              <th>Mutatie-soort</th>
              <th>Mededelingen</th>
            </tr>
          </thead>
          <tbody>
            {rows}
          </tbody>
        </table>
      </div>
    );
  }

  async refreshAccounts() {
    const self = this;
    const accountsPromise = await REST('/api/accounts')
    console.log('accountsPromise', accountsPromise);
    var accountsMap = {};
    var record;
    var index;
    for (index = 0; index < accountsPromise.entity.length; index++) {
      record = accountsPromise.entity[index];
      accountsMap[record.account] = record;
    }
    console.log('accountsMap', accountsMap);
    self.setState({accounts: accountsMap});
  }

  async refreshTransactions(prefix) {
    const self = this;
    if (prefix.length >= 4) {
      const dataPromise = await REST('/api/transactions?date=/^' + prefix + '/&sort=date,number');
      console.log('dataPromise', dataPromise);
      dataPromise.entity.forEach(record => {
        record.jar = self.getJar(record);
      });
      self.setState({transactions: dataPromise.entity});
    }
  }

  handlePrefixChange(event) {
    const prefix = event.target.value;
    this.setState({ prefix: prefix });
    this.refreshTransactions(prefix);
  }

  formatTransaction(record) {
    const self = this;
    const keys = [ 'date', 'name', 'jar', 'account', 'contraAccount', 'code', 'signedCents', 'kind', 'remarks' ]
    const cells = keys
      .map(
        (key) => {
          var value;
          if (!record.hasOwnProperty(key)) {
            value = '???';
          } else if (key === 'signedCents') {
            value = self.formatValue(record[key])
          } else if (key === 'account' || key === 'contraAccount') {
            value = self.formatAccount(record[key])
          } else {
            value = '' + record[key];
          }
          var cssClass = 'key_'+key;
          return <td class={cssClass}>{value}</td>;
        }
      )
    ;
    var cssClass = 'transaction';
    const d1 = self.getDepth(record.account);
    const d2 = self.getDepth(record.contraAccount);
    if (d1 * d2 > 0 && record.signedCents >= 0) {
      cssClass = cssClass + ' hidden';
    }
    return <tr class={cssClass}>{cells}</tr>;
  }

  getDepth(account) {
    const self = this;
    if (self.state.accounts.hasOwnProperty(account)) {
      return self.state.accounts[account].depth;
    } else {
      return 0;
    }
  }

  formatValue(value) {
    var prefix = '';
    var amount = value;
    if (amount < 0) {
      prefix = '-';
      amount = -amount;
    }
    const intPart = '' + Math.floor(amount / 100)
    var fraction = ('' + (100 + (amount % 100))).substring(1)
    return prefix + intPart + ',' + fraction;
  }

  formatAccount(value) {
    var accounts = this.state.accounts;
    if (accounts.hasOwnProperty(value)) {
      return accounts[value].label;
    } else {
      return value;
    }
  }

  getJar(record) {
    var accounts = this.state.accounts;
    var value = record.account;
    if (accounts && accounts.hasOwnProperty(value)) {
      return accounts[value].key;
    } else {
      return '?';
    }
    value = record.contraAccount;
    if (record.signedCents >= 0 && accounts && accounts.hasOwnProperty(value)) {
      return accounts[value].key;
    }
  }
}

export default Period;