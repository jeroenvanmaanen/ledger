import React, { Component } from 'react';
import REST from './rest-client';

class Period extends Component {
  constructor(props) {
    super(props);
    const initialPrefix = props.prefix ? props.prefix : '';
    this.state = { label: props.label, prefix: initialPrefix, transactions: [] };
    this.handlePrefixChange = this.handlePrefixChange.bind(this);
    this.refreshTransactions = this.refreshTransactions.bind(this);
    this.formatTransaction = this.formatTransaction.bind(this);
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

  async refreshTransactions(prefix) {
    const self = this;
    if (prefix.length >= 4) {
      const dataPromise = await REST('/api/transactions?date=/^' + prefix + '/&sort=date,number');
      console.log('dataPromise', dataPromise);
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
    const keys = [ 'date', 'name', 'account', 'contraAccount', 'code', 'signedCents', 'kind', 'remarks' ]
    const cells = keys
      .map(
        (key) => {
          var value;
          if (!record.hasOwnProperty(key)) {
            value = '???';
          } else if (key === 'signedCents') {
            value = self.formatValue(record[key])
          } else {
            value = '' + record[key];
          }
          var cssClass = 'key_'+key;
          return <td class={cssClass}>{value}</td>;
        }
      )
    ;
    return <tr>{cells}</tr>;
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
}

export default Period;