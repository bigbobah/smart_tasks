// Import libraries we need.
import { default as Web3} from 'web3';
import { default as contract } from 'truffle-contract'

// Import our contract artifacts and turn them into usable abstractions.
import smarttaskdispatcher_artifacts from '../../build/contracts/SmartTaskDispatcher.json'

var SmartTaskDispatcher = contract(smarttaskdispatcher_artifacts);

// The following code is simple to show off interacting with your contracts.
// As your needs grow you will likely need to change its form and structure.
// For application bootstrapping, check out window.addEventListener below.
var accounts;
var account;
var TASK_STATUSES = ["New", "Assigned", "Resolved", "Accepted", "Canceled"];

window.App = {
  tasks: [],
  start: function() {
    var self = this;

    SmartTaskDispatcher.setProvider(web3.currentProvider);

    // Get the initial account balance so it can be displayed.
    web3.eth.getAccounts(function(err, accs) {
      if (err != null) {
        alert("There was an error fetching your accounts.");
        return;
      }

      if (accs.length == 0) {
        alert("Couldn't get any accounts! Make sure your Ethereum client is configured correctly.");
        return;
      }

      accounts = accs;
      account = accounts[0];
      $('#active-ethereum-account').text(account);

      self.startMetamaskSync();
      self.startBlockchainSync();
      self.getTasks();

      $('#create-task-button').click(function() {
        SmartTaskDispatcher.deployed().then(function(instance) {
          return instance.createTask({
              from: account,
              value: web3.toWei(Number($('#bounty').val()), "ether")
          });
        });
        return false;
      });

      // self.refreshBalance();
    });
  },

  startMetamaskSync: function() {
    setInterval(function() {
      if (web3.eth.accounts[0] !== account) {
        account = web3.eth.accounts[0];
        $('#active-ethereum-account').text(account);
      }
    }, 100);
  },

  startBlockchainSync: function() {
    var self = this;
    setInterval(function() {
      self.getTasks();
    }, 500);
  },

  getTasks: function() {
    var self = this;
    var contract;
    SmartTaskDispatcher.deployed().then(function(instance) {
      window.st = instance;
      contract = instance;
      return instance.getTasksCount.call();
    }).then(function(result) {
      let tasks_count = result.toNumber();
      $('#tasks-count').text(tasks_count);
      if (tasks_count) {
        self.loadTasks(contract, tasks_count);
      }
      else {
        self.tasks = [];
      }
    });
  },

  loadTasks: function(contract, count) {
    function renderRow(task) {
      return '<tr>' +
        '                    <td>' + task.id + '</td>\n' +
        '                    <td>' + task.bounty + ' ETH </td>\n' +
        '                    <td>' + task.owner + '</td>\n' +
        '                    <td>' + task.assignee + '</td>\n' +
        '                    <td>' + TASK_STATUSES[task.status] + '</td>' +
        '</tr>';
    }

    var self = this;
    self.tasks = [];
    var promises = [];
    for (var i = 0; i < count; i++) {

      var p = contract.tasks.call(i).then(function(data) {
        self.tasks.push({
          id: data[0].toNumber(),
          bounty: web3.fromWei(data[1].toNumber(), 'ether'),
          owner: data[2],
          assignee: data[3],
          status: data[4].toNumber()
        });
      });
      promises.push(p);

    }
    Promise.all(promises).then(function() {
      $('tbody', '#all-tasks').html(self.tasks.map(renderRow).join(''));
    });
  },

  setStatus: function(message) {
    var status = document.getElementById("status");
    status.innerHTML = message;
  },

  refreshBalance: function() {
    var self = this;

    var meta;

    SmartTaskDispatcher.deployed().then(function(instance) {
      window.st=instance;
    });

    MetaCoin.deployed().then(function(instance) {
      meta = instance;
      return meta.getBalance.call(account, {from: account});
    }).then(function(value) {
      var balance_element = document.getElementById("balance");
      balance_element.innerHTML = value.valueOf();
    }).catch(function(e) {
      console.log(e);
      self.setStatus("Error getting balance; see log.");
    });
  },

  sendCoin: function() {
    var self = this;

    var amount = parseInt(document.getElementById("amount").value);
    var receiver = document.getElementById("receiver").value;

    this.setStatus("Initiating transaction... (please wait)");

    var meta;
    MetaCoin.deployed().then(function(instance) {
      meta = instance;
      return meta.sendCoin(receiver, amount, {from: account});
    }).then(function() {
      self.setStatus("Transaction complete!");
      self.refreshBalance();
    }).catch(function(e) {
      console.log(e);
      self.setStatus("Error sending coin; see log.");
    });
  }
};

window.addEventListener('load', function() {
  // Checking if Web3 has been injected by the browser (Mist/MetaMask)
  if (typeof web3 !== 'undefined') {
    console.warn("Using web3 detected from external source. If you find that your accounts don't appear or you have 0 MetaCoin, ensure you've configured that source properly. If using MetaMask, see the following link. Feel free to delete this warning. :) http://truffleframework.com/tutorials/truffle-and-metamask")
    // Use Mist/MetaMask's provider
    window.web3 = new Web3(web3.currentProvider);
  } else {
    console.warn("No web3 detected. Falling back to http://127.0.0.1:9545. You should remove this fallback when you deploy live, as it's inherently insecure. Consider switching to Metamask for development. More info here: http://truffleframework.com/tutorials/truffle-and-metamask");
    // fallback - use your fallback strategy (local node / hosted node + in-dapp id mgmt / fail)
    window.web3 = new Web3(new Web3.providers.HttpProvider("http://127.0.0.1:9545"));
  }

  App.start();
});
