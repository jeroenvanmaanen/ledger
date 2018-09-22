import React, { Component } from 'react';
import REST from './rest-client';
import UUID from 'uuid-js';
import Period from './Period';

class Compound extends Component {
  constructor(props) {
    super(props);
    this.handleFocusChange = this.handleFocusChange.bind(this);
    this.handleLabelChange = this.handleLabelChange.bind(this);
    this.isMember = this.isMember.bind(this);
    this.state = { _id: '', label: '', transactions: [], balance: {}, jars: '' };
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

  findTransactionElement(event) {
    var target = event.target;
    var toggle = false;
    while (!this.hasClass(target, 'transaction') && target.parentNode && target.tagName !== 'TABLE') {
        console.log('Handle focus change: target parent:', target, target.tagName, target.className, target.parentNode);
        if (target.className === 'key_add') {
            toggle = true;
        }
        target = target.parentNode;
    }
    return {
      target: target,
      toggle: toggle
    }
  }

  handleFocusChange(event) {
    const transactionElement = this.findTransactionElement(event);
    const target = transactionElement.target;
    const toggle = transactionElement.toggle;
    console.log('Handle focus change: target:', target, target.tagName, target.className, target.parentNode);
    if (this.hasClass(target, 'transaction') && target.getAttribute('data-id')) {
        this.updateState(target, toggle);
    }
  }

  async updateState(target, toggle) {
    const transactionId = target.getAttribute('data-id');
    const date = this.getField(target, 'date');
    const amount = this.getField(target, 'signedCents');
    const jar = this.getJar(target, 'account');
    const contraJar = this.getJar(target, 'contraAccount');
    const transaction = {
        _id: transactionId,
        date: date,
        amount: amount,
        jar: jar,
        contraJar: contraJar
    };
    var newState = {};
    var transactions;
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
        newState._id = '';
        const label = await this.getLabel(transactionId);
        newState.label = label ? label.label : '';
    }
    newState.transactions = transactions;
    this.setState(newState);
    this.updateBalance(newState, toggle, transactionId);
  }

  updateBalance(newState, toggle, transactionId) {
    var newBalance = {}
    newState.transactions.forEach(transaction => {
        if (newBalance[transaction.jar] === undefined) {
            newBalance[transaction.jar] = 0;
        }
        newBalance[transaction.jar] += Number(transaction.amount);
        if (newBalance[transaction.contraJar] === undefined) {
            newBalance[transaction.contraJar] = 0;
        }
        newBalance[transaction.contraJar] -= Number(transaction.amount);
    });
    newState.balance = newBalance;
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
    newState.jars = jars;
    this.setState({ jars: jars.join() });
    if (toggle) {
        this.saveState(newState, transactionId)
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
    const result = !!(' ' + nodeClass + ' ').match(' ' + className + ' ');
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
    const isCompound = newState.transactions.length > 1;
    if (isCompound) {
        console.log('Compound: update new state:', newState);
        if (transactionId) {
            if (this.contains(newState, transactionId)) {
                console.log('Compound: link transaction:', transactionId);
            } else {
                console.log('Compound: unlink transaction:', transactionId);
            }
        }
    } else {
        if (transactionId) {
            if (this.contains(newState, transactionId)) {
                console.log('Compound: load:', transactionId);
            } else {
                console.log('Compound: delete:', transactionId);
            }
        } else if (newState.transactions.length === 1) {
            console.log('Save label:', newState.label, newState.transactions);
            this.saveLabel(newState, newState.transactions[0]._id);
        }
    }
  }

  contains(state, transactionId) {
    return state.transactions.some((t) => {
      return t._id === transactionId;
    });
  }

  async getLabel(transactionId) {
    const result = await REST({
      path: '/api/label?transactionId="' + transactionId + '"'
    });
    console.log('Get label: result', result);
    const entities = result.entity
    return entities.length < 1 ? undefined : entities[0];
  }

  async saveLabel(newState, transactionId) {
    console.log('Save label: transaction ID:', transactionId);
    const labelId = await this.getLabelId(transactionId);
    var newLabel = {
      transactionId: transactionId
    };
    if (newState.transactions.length <= 1) {
      newState._id = '';
    } else if (!newState._id) {
      newState._id = UUID.create();
    }
    if (newState.transactions.includes(transactionId)) {
      newLabel.compoundId = newState._id;
    } else {
      newLabel.compoundId = '';
    }
    newLabel.label = newState.label;
    console.log("New label:", newLabel);
    var saved = await REST({
      method: 'PUT',
      path: '/api/label/' + labelId,
      headers: {
        'Content-Type': 'application/json'
      },
      entity: newLabel
    });
    console.log('Saved:', saved);
  }

  async getLabelId(transactionId) {
    const label = await this.getLabel(transactionId);
    return label ? label.id : transactionId;
  }
}

export default Compound;
