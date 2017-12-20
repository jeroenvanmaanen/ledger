import React, { Component } from 'react';
import './App.css';
import Period from './Period';
import UUID from 'uuid-js';

class App extends Component {

  render() {
    console.log('UUID', UUID);
    const uuid = UUID.create();
    console.log('uuid', uuid);
    return (
      <div className="App">
        <Period label="Period 1"/>
        <Period label="Period 2"/>
      </div>
    );
  }
}

export default App;
