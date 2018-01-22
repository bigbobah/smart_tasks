pragma solidity ^0.4.0;


contract SmartTaskDispatcher {
    enum TaskStatus {New, Assigned, Resolved, Accepted, Canceled}

    struct SmartTask {
        uint id;
        uint bounty;
        address owner;
        address assignee;
        bool is_active;  // hack to flag a presence of task inside of mapping
        TaskStatus status;
    }

    mapping (uint => SmartTask) public tasks;

    function SmartTaskDispatcher() {
    }

    function createTask(uint task_id) external payable {
        /*
            Create a new task and hold its ether bounty
            msg.sender is task_owner
            msg.value is task bounty
        */

        var task = tasks[task_id];

        require (task.status == TaskStatus.Canceled || !task.is_active);

        tasks[task_id] = SmartTask({
            id: task_id,
            bounty: msg.value,
            owner: msg.sender,
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
        var task = tasks[task_id];

        require (task.status == TaskStatus.New && task.owner == msg.sender);

        msg.sender.transfer(task.bounty);
        task.status = TaskStatus.Canceled;
    }

    function assignTask(uint task_id) external {
        /*
            Assign task to the message sender
        */
        var task = tasks[task_id];

        require (task.status == TaskStatus.New);

        task.assignee = msg.sender;
        task.status = TaskStatus.Assigned;
    }

    function rollbackAssignment(uint task_id) external {
        /*
            Reset task assignee, make it available to cancel
        */
        var task = tasks[task_id];

        require (task.status == TaskStatus.Assigned && task.assignee == msg.sender);

        task.assignee = 0;
        task.status = TaskStatus.New;
    }

    function resolveTask(uint task_id) external {
        /*
            Mark task as resolved, make in available to be accepted by owner
        */
        var task = tasks[task_id];

        require (task.status == TaskStatus.Assigned && task.assignee == msg.sender);

        task.status = TaskStatus.Resolved;
    }

    function acceptTask(uint task_id) external {
        /*
            Accept task and transfer the bounty amount to its assignee
        */
        var task = tasks[task_id];

        require (task.status == TaskStatus.Resolved && task.owner == msg.sender);

        task.status = TaskStatus.Accepted;
        task.assignee.transfer(task.bounty);
    }
}
