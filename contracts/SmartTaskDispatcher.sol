pragma solidity ^0.4.0;


contract SmartTaskDispatcher {
    enum TaskStatus {New, Assigned, Resolved, Accepted, Canceled}

    struct SmartTask {
        uint id;
        uint bounty;
        address assignee;
        bool is_active;  // hack to flag a presence of task inside of mapping
        TaskStatus status;
    }

    mapping (address => mapping (uint => SmartTask)) public holdings;

    function SmartTaskDispatcher() {
    }

    function createTask(uint task_id) external payable {
        /*
            Create a new task and hold its ether bounty
            msg.sender is task_owner
            msg.value is task bounty
        */

        var task = holdings[msg.sender][task_id];

        require (task.status == TaskStatus.Canceled || !task.is_active);

        holdings[msg.sender][task_id] = SmartTask({
            id: task_id,
            bounty: msg.value,
            assignee: 0,
            status: TaskStatus.New,
            is_active: true
        });
    }

    function cancelTask(uint task_id) external {
        /*
            Only available to call over the task with status New
            returns the held ether to the owner
            marks the task as Canceled
        */
        var task = holdings[msg.sender][task_id];

        require (task.status == TaskStatus.New);

        msg.sender.transfer(task.bounty);
        task.status = TaskStatus.Canceled;
    }
}
