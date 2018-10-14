import React, { Component } from 'react';
import REST from './rest-client';
import UUID from 'uuid-js';
import Period from './Period';

class Compound extends Component {
  constructor(props) {
    super(props);
    this.handleFocusChange = this.handleFocusChange.bind(this);
    this.handleLabelChange = this.handleLabelChange.bind(this);
    this.getAccounts = this.getAccounts.bind(this);
    this.isMember = this.isMember.bind(this);
    this.state = { _id: '', label: '', transactions: [], balance: {}, jars: '', intendedJar: '*', compoundId: undefined, staticAccounts: {} };
    this.refreshAccounts();
  }

  render() {
    const compoundApi = {
        changeFocus: this.handleFocusChange,
        isMember: this.isMember,
        getAccounts: this.getAccounts
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
    self.setState({staticAccounts: accountsMap});
  }

  getAccounts() {
    return this.state.staticAccounts;
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
    const transactionKey = target.getAttribute('data-key');
    const date = this.getField(target, 'date');
    const amount = this.getField(target, 'signedCents');
    const jar = this.getJar(target, 'account');
    const contraJar = this.getJar(target, 'contraAccount');
    const transaction = {
        _id: transactionId,
        key: transactionKey,
        date: date,
        amount: amount,
        jar: jar,
        contraJar: contraJar
    };
    const transactionRef = {
        _id: transactionId,
        key: transactionKey
    };
    var stateChange = {};
    var transactions;
    if(toggle) {
        console.log('Toggle');
        transactions = this.state.transactions;
        if (transactions.some(t => t.key === transactionKey)) {
            console.log('Remove');
            transactions = transactions.filter(t => t.key !== transactionKey);
            if (transactions.length === 1 && this.state.compoundId) {
                await this.deleteCompound(this.getRef(transactions[0]), this.state.compoundId);
                stateChange.compoundId = undefined;
            }
        } else {
            console.log('Add');
            transactions.push(transaction);
            if (transactions.length === 2) {
              console.log('Add compound:', transactions)
              const newState = this.copyState();
              newState.transactions = transactions;
              const compoundId = await this.insertCompound(this.getRef(transactions[0]), newState);
              stateChange.compoundId = compoundId;
            }
        }
    } else {
        console.log('Singleton');
        transactions = [ transaction ];
        stateChange._id = '';
        const label = await this.getLabel(transactionRef);
        console.log("Label:", label);
        stateChange.label = label ? label.label : '';
        if (label && label.compoundId) {
            const result = await REST('/api/compound/' + label.compoundId);
            const compound = result.entity;
            if (compound.transactions) {
                console.log('Retrieved compound transaction:', compound);
                stateChange.compoundId = label.compoundId;
                stateChange.transactions = compound.transactions;
                stateChange.label = compound.label;
                transactions = stateChange.transactions;
            }
        }
    }
    stateChange.transactions = transactions;
    console.log('State change:', stateChange);
    this.setState(stateChange);
    this.updateBalance(stateChange, toggle, transactionRef);
  }

  updateBalance(newState, toggle, transactionRef) {
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
        this.saveState(newState, transactionRef)
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

  isMember(transactionKey) {
    var result = false;
    this.state.transactions.forEach(transaction => {
        const key = transaction && transaction.key;
        if (key === transactionKey) {
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

  async saveState(update, transactionRef) {
    // console.log('Compound: save state:', this.state, update);
    var newState = this.copyState();
    Object.keys(update).forEach((key) => {
        newState[key] = update[key];
    });
    const isCompound = newState.transactions.length > 1;
    if (isCompound) {
        console.log('Compound: update new state:', newState);
        if (transactionRef) {
            if (this.contains(newState, transactionRef)) {
                console.log('Compound: link transaction:', transactionRef.key);
                this.linkTransaction(transactionRef, newState);
            } else {
                console.log('Compound: unlink transaction:', transactionRef.key);
                this.unlinkTransaction(transactionRef);
            }
        }
        this.saveLabel(newState);
    } else {
        if (transactionRef) {
            if (this.contains(newState, transactionRef)) {
                console.log('Compound: load:', transactionRef.key);
            } else {
                console.log('Compound: delete:', transactionRef.key);
            }
        } else if (newState.transactions.length === 1) {
            this.saveLabel(newState, newState.transactions[0]._id);
        }
    }
  }

  contains(state, transactionRef) {
    return state.transactions.some((t) => {
      return t.key === transactionRef.key;
    });
  }

  async getLabel(transactionRef) {
    const result = await REST({
      path: '/api/label?transactionKey="' + transactionRef.key + '"'
    });
    console.log('Get label: result', result);
    const entities = result.entity
    return entities.length < 1 ? undefined : entities[0];
  }

  async saveLabel(newState, transactionRef) {
    console.log('Save label:', newState.label, newState.transactions, transactionRef);
    const compoundId = newState.compoundId || this.state.compoundId;
    if (transactionRef) {
        const labelId = await this.getLabelId(transactionRef);
        var newLabel = {
          transactionId: transactionRef._id,
          transactionKey: transactionRef.key
        };
        newLabel.compoundId = compoundId;
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
        console.log('Saved label:', saved);
    }
    if (compoundId) {
      var compound = {};
      compound.transactions = this.summarize(newState.transactions);
      compound.balance = newState.balance;
      compound.label = newState.label;
      const result = await REST({
        method: 'PUT',
        path: '/api/compound/' + compoundId,
        headers: {
          'Content-Type': 'application/json'
        },
        entity: compound
      });
      console.log("Saved compound", result);
    }
  }

  getRef(transaction) {
    return {
      _id: transaction._id,
      key: transaction.key
    };
  }

  summarize(transactions) {
    var transactionSummaries = []
    transactions.forEach(transaction => {
      transactionSummaries.push({
        _id: transaction._id,
        key: transaction.key,
        date: transaction.date,
        jar: transaction.jar,
        contraJar: transaction.contraJar,
        amount: transaction.amount
      });
    });
    return transactionSummaries;
  }

  async getLabelId(transactionRef) {
    const label = await this.getLabel(transactionRef);
    console.log("Get label ID:", transactionRef, label);
    return label ? label.id : transactionRef._id;
  }

  async insertCompound(transactionRef, newState) {
    var compound = {};
    compound.label = newState.label;
    compound.transactions = this.summarize(newState.transactions);
    compound.balance = newState.balance;
    const result = await REST({
      method: 'POST',
      path: '/api/compound',
      headers: {
        'Content-Type': 'application/json'
      },
      entity: compound
    });
    console.log("Insert compound", result);
    const compoundId = result.entity.id;
    newState.compoundId = compoundId;
    await this.linkTransaction(transactionRef, newState);
    this.setState({compoundId: compoundId})
    return compoundId;
  }

  async deleteCompound(transactionRef, compoundId) {
    if (compoundId) {
        var newState = this.copyState();
        newState.compoundId = undefined;
        this.saveLabel(newState, transactionRef);
        await REST({
          method: 'DELETE',
          path: '/api/compound/' + compoundId
        });
    }
  }

  async linkTransaction(transactionRef, newState) {
    const state = newState || this.state;
    const compoundId = state.compoundId;
    if (!compoundId) {
      return;
    }
    await this.saveLabel(newState, transactionRef);
  }

  async unlinkTransaction(transactionRef) {
    const labelId = await this.getLabelId(transactionRef);
    await REST({
      method: 'DELETE',
      path: '/api/label/' + labelId,
    });
  }

  copyState() {
    var newState = {};
    Object.keys(this.state).forEach((key) => {
        if (!key.match(/^static.*/)) {
            newState[key] = this.state[key];
        }
    });
    return newState;
  }
}

export default Compound;
