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
  myTasks: [],
  assigneeTasks: [],
  openTasks: [],
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
      self.updateAccStats();

      self.startMetamaskSync();
      self.startBlockchainSync();
      self.getTasks();

      SmartTaskDispatcher.deployed().then(function(instance) {

        let contract = instance;

        $('#create-task-button').click(function() {
            return contract.createTask({
                from: account,
                value: web3.toWei(Number($('#bounty').val()), "ether")
            });
          });

        $('a[role=tab]').click(function() {
          self.updateSubcount($(this).attr('id'));
        });

        $('#my-tasks')
          .on('click', '.cancel-button', function() {
            let task_id = Number($(this).closest('tr').data('id')) - 1;
            return contract.cancelTask(task_id, {from: account});
          })
          .on('click', '.reject-button', function() {
            let task_id = Number($(this).closest('tr').data('id')) - 1;
            return contract.rejectTask(task_id, {from: account});
          })
          .on('click', '.accept-button', function() {
            let task_id = Number($(this).closest('tr').data('id')) - 1;
            return contract.acceptTask(task_id, {from: account});
          });

        $('#open-tasks').on('click', '.take-task-button', function() {
          let task_id = Number($(this).closest('tr').data('id')) - 1;
          return contract.assignTask(task_id, {from: account});
        });

        $('#assignee-tasks')
          .on('click', '.cancel-button', function() {
            let task_id = Number($(this).closest('tr').data('id')) - 1;
            return contract.rollbackAssignment(task_id, {from: account});
          })
          .on('click', '.resolve-button', function() {
            let task_id = Number($(this).closest('tr').data('id')) - 1;
            return contract.resolveTask(task_id, {from: account});
          });
      });

    });
  },

  updateAccStats: function() {
    $('#active-ethereum-account').text(account);
    web3.eth.getBalance(account, function(error, response) {
      $('#balance').text(web3.fromWei(response.toNumber(), "ether"));
    });
  },

  startMetamaskSync: function() {
    let self = this;
    setInterval(function() {
      if (web3.eth.accounts[0] !== account) {
        account = web3.eth.accounts[0];
        self.updateAccStats();
      }
    }, 100);
  },

  startBlockchainSync: function() {
    var self = this;
    setInterval(function() {
      self.getTasks();
      self.updateAccStats();
    }, 2000);
  },

  updateSubcount: function(id) {
    let subcount = {
      'all-tasks-tab': this.tasks,
      'my-tasks-tab': this.myTasks,
      'assignee-tasks-tab': this.assigneeTasks,
      'open-tasks-tab': this.openTasks,
    }[id || $('a[role=tab].active').attr('id')].length;
    $('#tasks-subtotal-count').text(subcount);
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
      if (tasks_count) {
        self.loadTasks(contract, tasks_count).then(function() {
        self.updateSubcount();
        });
      }
      else {
        self.tasks = [];
        self.updateSubcount();
      }
    });
  },

  getTaskStatus: function(task) {
    if (task.status === 1 /* Assigned */ && task.rejected_on) {
      return 'Rejected';
    }
    return TASK_STATUSES[task.status];
  },

  formatETHAddress(address) {
    if (address == '-') {
      return address;
    }
    return address.substr(0, 20) + '...';
  },

  loadTasks: function(contract, count) {
    function renderAllTasksRow(task) {
      return '<tr>' +
        '                    <td>' + task.id + '</td>' +
        '                    <td>' + task.bounty + ' ETH </td>' +
        '                    <td>' + self.formatETHAddress(task.owner) + '</td>' +
        '                    <td>' + self.formatETHAddress(task.assignee) + '</td>' +
        '                    <td>' + self.getTaskStatus(task) + '</td>' +
        '</tr>';
    }

    function renderMyTasksRow(task) {
      let actions = '';
      if (task.status === 0) {
        // Display "Cancel" button only for tasks with status "New"
        actions = '<button class="btn btn-danger cancel-button">Cancel</button>';
      }
      else if (task.status === 2) {
        // Display "Reject" & "Accept" buttons only for tasks with status "Resolved"
        actions += '<button class="btn btn-danger reject-button">Reject</button> ';
        actions += '<button class="btn btn-success accept-button">Accept</button>';
      }
      return '<tr data-id="' + task.id + '">' +
        '                    <td>' + task.id + '</td>' +
        '                    <td> - </td>' +
        '                    <td>' + task.bounty + ' ETH </td>' +
        '                    <td>' + self.formatETHAddress(task.assignee) + '</td>' +
        '                    <td>' + self.getTaskStatus(task) + '</td>' +
        '                    <td class="actions">' +
                                actions +
        '                    </td>' +
        '</tr>';
    }

    function renderAssigneeTasksRow(task) {
      let actions = '';
      if (task.status === 1) {
        // Display "Cancel" and "Resolve" buttons only for tasks with status "Assigned"
        actions += '<button class="btn btn-danger cancel-button">Cancel</button> ';
        actions += '<button class="btn btn-success resolve-button">Resolve</button>';
      }
      return '<tr data-id="' + task.id + '">' +
        '                    <td>' + task.id + '</td>' +
        '                    <td> - </td>' +
        '                    <td>' + task.bounty + ' ETH </td>' +
        '                    <td>' + self.formatETHAddress(task.owner) + '</td>' +
        '                    <td>' + self.getTaskStatus(task) + '</td>' +
        '                    <td class="actions">' +
                                actions +
        '                    </td>' +
        '</tr>';
    }

    function renderOpenTasksRow(task) {
      return '<tr data-id="' + task.id + '">' +
        '                    <td>' + task.id + '</td>' +
        '                    <td> - </td>' +
        '                    <td>' + task.bounty + ' ETH </td>' +
        '                    <td>' + self.formatETHAddress(task.owner) + '</td>' +
        '                    <td>' + self.getTaskStatus(task) + '</td>' +
        '                    <td class="actions">' +
        '                       <button class="btn btn-success take-task-button">Take</button>' +
        '                    </td>' +
        '</tr>';
    }

    var self = this;
    var tasks = [];
    var promises = [];
    for (var i = 0; i < count; i++) {

      var p = contract.tasks.call(i).then(function(data) {
        tasks.push({
          id: data[0].toNumber(),
          bounty: web3.fromWei(data[1].toNumber(), 'ether'),
          owner: data[2],
          assignee: data[3] === '0x0000000000000000000000000000000000000000' ? '-' : data[3],
          status: data[4].toNumber(),
          rejected_on: data[5].toNumber()
        });
      });
      promises.push(p);

    }
    return Promise.all(promises).then(function() {
      self.tasks = tasks.filter(function(item) {
        return item.status !== 4; // Exclude canceled tasks
      }).sort(function(a, b) {
        return a.id > b.id;
      });
      self.myTasks = self.tasks.filter(function(item) {
        return item.owner === account;
      });
      self.assigneeTasks = self.tasks.filter(function(item) {
        return item.assignee === account;
      });
      self.openTasks = self.tasks.filter(function(item) {
        return item.status === 0;
      });
      $('tbody', '#all-tasks').html(self.tasks.map(renderAllTasksRow).join(''));
      $('tbody', '#my-tasks').html(self.myTasks.map(renderMyTasksRow).join(''));
      $('tbody', '#assignee-tasks').html(self.assigneeTasks.map(renderAssigneeTasksRow).join(''));
      $('tbody', '#open-tasks').html(self.openTasks.map(renderOpenTasksRow).join(''));
      $('#tasks-count').text(self.tasks.length);
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
