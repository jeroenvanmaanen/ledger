import React, { Component } from 'react';
import REST from './rest-client';
import Period from './Period';

class Compound extends Component {
  constructor(props) {
    super(props);
    this.handleFocusChange = this.handleFocusChange.bind(this);
    this.handleLabelChange = this.handleLabelChange.bind(this);
    this.isMember = this.isMember.bind(this);
    this.state = { label: '', transactions: [], balance: {}, jars: '' };
  }

  render() {
    const compoundApi = {
        changeFocus: this.handleFocusChange,
        isMember: this.isMember
    };
    console.log('Balance:', this.state.balance);
    return (
        <div className="CompoundContainer">
            <div className="Compound">
                <h2>Compound [{this.state.jars}]</h2>
                <p>Label:</p>
                <p><input type="text" name="label" className="compoundInput" value={this.state.label} onChange={this.handleLabelChange} /></p>
                <p>Balance:</p>
                <ul>
                    {Object.keys(this.state.balance).map((jar) => {
                        return (<li>{jar}: {this.state.balance[jar]}</li>);
                    })}
                </ul>
                <p>Transactions:</p>
                <ul>
                    {this.state.transactions.map((transaction) => {
                        return (<li>{transaction._id}: {transaction.amount} {transaction.jar} {transaction.contraJar}</li>);
                    })}
                </ul>
            </div>
            <Period label="Period" compoundApi={compoundApi} />
        </div>
    );
  }

  handleLabelChange(event) {
    const target = event.target;
    this.setState({ label: target.value });
    this.saveState({ label: target.value });
  }

  handleFocusChange(event) {
    var target = event.target;
    var toggle = false;
    while (!this.hasClass(target, 'transaction') && target.parentNode && target.tagName !== 'TABLE') {
        console.log('Handle focus change: target parent:', target, target.tagName, target.className, target.parentNode);
        if (target.className === 'key_add') {
            toggle = true;
        }
        target = target.parentNode;
    }
    console.log('Handle focus change: target:', target, target.tagName, target.className, target.parentNode);
    var transactions;
    if (this.hasClass(target, 'transaction') && target.getAttribute('data-id')) {
        var transactionId = target.getAttribute('data-id');
        var amount = this.getField(target, 'signedCents');
        var jar = this.getJar(target, 'account');
        var contraJar = this.getJar(target, 'contraAccount');
        var transaction = {
            _id: transactionId,
            amount: amount,
            jar: jar,
            contraJar: contraJar
        };
        if(toggle) {
            console.log('Toggle');
            transactions = this.state.transactions;
            if (transactions.some(t => t._id === transactionId)) {
                console.log('Remove');
                transactions = transactions.filter(t => t._id !== transactionId);
            } else {
                console.log('Add');
                transactions.push(transaction);
            }
        } else {
            console.log('Singleton');
            transactions = [ transaction ];
        }
        this.setState({ transactions: transactions });
        this.updateBalance(transactions, toggle, transactionId);
    }
  }

  updateBalance(transactions, toggle, transactionId) {
    var newBalance = {}
    transactions.forEach(transaction => {
        if (newBalance[transaction.jar] === undefined) {
            newBalance[transaction.jar] = 0;
        }
        newBalance[transaction.jar] += Number(transaction.amount);
        if (newBalance[transaction.contraJar] === undefined) {
            newBalance[transaction.contraJar] = 0;
        }
        newBalance[transaction.contraJar] -= Number(transaction.amount);
    });
    this.setState({ balance: newBalance });
    var jars = [];
    Object.keys(newBalance).forEach((key) => {
        if (!key || key === '*') {
            return;
        }
        if (!newBalance[key]) {
            return;
        }
        jars.push(key);
    });
    this.setState({ jars: jars.join() });
    if (toggle) {
        this.saveState({ transactions: transactions, balance: newBalance }, transactionId)
    }
  }

  getField(node, key) {
    var result = undefined;
    node.childNodes.forEach(child => {
        if (child.className === 'key_' + key) {
            var unformatted = child.getAttribute('unformatted');
            if (unformatted === undefined) {
                result = child.textContent;
            } else {
                result = unformatted;
            }
        }
    });
    return result;
  }

  getJar(node, key) {
    var result = undefined;
    node.childNodes.forEach(child => {
        if (child.className === 'key_' + key) {
            result = child.getAttribute('jar');
        }
    });
    return result;
  }

  isMember(transactionId) {
    var result = false;
    this.state.transactions.forEach(transaction => {
        if (transaction._id === transactionId) {
            result = true;
        }
    });
    return result;
  }

  hasClass(node, className) {
    const nodeClass = node.className;
    const result = (' ' + nodeClass + ' ').match(' ' + className + ' ');
    console.log('Has class:', nodeClass, className, result);
    return result;
  }

  saveState(update, transactionId) {
    // console.log('Compound: save state:', this.state, update);
    var newState = {};
    Object.keys(this.state).forEach((key) => {
        newState[key] = this.state[key];
    });
    Object.keys(update).forEach((key) => {
        newState[key] = update[key];
    });
    console.log('Compound: save new state:', newState, transactionId);
  }
}

export default Compound;
