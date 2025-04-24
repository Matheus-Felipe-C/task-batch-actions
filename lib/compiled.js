(() => {
  // plugin.js
  var plugin = {
    replaceText: {
      "Tag tasks in batch": async function(app, text) {
        try {
          const tasks = await this._transformTextIntoTaskArray(app, text);
          await this._batchTagTasks(app, tasks);
        } catch (err) {
          console.log(err);
          app.alert(err);
        }
      },
      "Move tasks in batch": async function(app, text) {
        try {
          const tasks = await this._transformTextIntoTaskArray(app, text);
          await this._batchMoveTasks(app, tasks);
        } catch (error) {
          console.log(error);
          app.alert(error);
        }
      },
      "Delete tags in batch": async function(app, text) {
        try {
          const tasks = await this._transformTextIntoTaskArray(app, text);
          await this._batchDeleteTags(app, tasks);
        } catch (error) {
          console.log(error);
          app.alert(error);
        }
      },
      "Edit task details in batch": async function(app, text) {
        try {
          const tasks = await this._transformTextIntoTaskArray(app, text);
          await this._batchEditTaskDetails(app, tasks);
        } catch (error) {
          console.log(error);
          app.alert(error);
        }
      }
    },
    noteOption: {
      "Tag tasks in batch": async function(app, noteUUID) {
        try {
          const tasks = await this._getTasksFromNote(app, noteUUID);
          await this._batchTagTasks(app, tasks);
        } catch (err) {
          console.log(err);
          app.alert(err);
        }
      },
      "Move tasks in batch": async function(app, noteUUID) {
        try {
          const tasks = await this._getTasksFromNote(app, noteUUID);
          await this._batchMoveTasks(app, tasks);
        } catch (error) {
          console.log(error);
          app.alert(error);
        }
      },
      "Delete tags in batch": async function(app, noteUUID) {
        try {
          const tasks = await this._getTasksFromNote(app, noteUUID);
          await this._batchDeleteTags(app, tasks);
        } catch (error) {
          console.log(error);
          app.alert(error);
        }
      },
      "Edit task details in batch": async function(app, noteUUID) {
        try {
          const tasks = await this._getTasksFromNote(app, noteUUID);
          await this._batchEditTaskDetails(app, tasks);
        } catch (error) {
          console.log(error);
          app.alert(error);
        }
      }
    },
    /**
     * Adds inline tags to the selected tasks
     * @param {*} app 
     * @param {string} text With the tasks separated by linebreaks
     * @returns {void}
     */
    async _batchTagTasks(app, tasks) {
      const systemNotes = await app.filterNotes();
      const inlineTag = await app.prompt("Choose an inline tag", {
        inputs: [
          { label: "Inline tag selection", type: "note", options: systemNotes }
        ]
      });
      if (!inlineTag)
        throw new Error("Inline tag field cannot be empty");
      console.log("Inline tag to add:\n");
      console.log(inlineTag);
      await Promise.all(tasks.map(async (task) => {
        const newtaskName = ` ${task.content}
[${inlineTag.name}](https://www.amplenote.com/notes/${inlineTag.uuid})`;
        await app.updateTask(task.uuid, { content: newtaskName });
      }));
      console.log("Tasks tagged successfully!");
    },
    /**
     * Moves the selected tasks to another note
     * @param {*} app 
     * @param {string} text With tasks separated by linebreaks
     * @returns {void}
     */
    async _batchMoveTasks(app, tasks) {
      const systemNotes = await app.filterNotes();
      const targetNote = await app.prompt("Choose a note", {
        inputs: [
          { label: "Target note", type: "note", options: systemNotes }
        ]
      });
      if (!targetNote)
        throw new Error("Target note cannot be empty");
      console.log("Note to move tasks to: ");
      console.log(targetNote);
      await Promise.all(tasks.map(async (task) => {
        const noteUUID = targetNote.uuid;
        await app.updateTask(task.uuid, { noteUUID });
        console.log(task);
      }));
    },
    /**
     * Deletes the inline tags of the selected tasks.
     * @param {*} app 
     * @param {string} text With the selected tasks separated by linebreaks
     * @returns {void}
     */
    async _batchDeleteTags(app, tasks) {
      let noteUUIDs = [];
      tasks.map((task) => {
        const noteLink = task.content.match(/\((.*?)\)/g).map((match) => match.slice(1, -1));
        noteLink.forEach((link) => {
          const uuid = link.match(/\/([^\/]+)$/);
          noteUUIDs.push(uuid[1]);
        });
      });
      noteUUIDs = [...new Set(noteUUIDs)];
      if (!noteUUIDs)
        throw new Error("No inline tags found to delete");
      let tagOptions = await Promise.all(noteUUIDs.map(async (note) => {
        note = await app.findNote({ uuid: note });
        const object = {
          label: note.name,
          value: `[${note.name}](https://www.amplenote.com/notes/${note.uuid})`
        };
        return object;
      }));
      console.log("NoteUUIDs of the inline tags:");
      console.log(tagOptions);
      const selectedTag = await app.prompt("Choose an inline tag to remove", {
        inputs: [
          { label: "Inline tag selection", type: "select", options: tagOptions }
        ]
      });
      if (!selectedTag)
        throw new Error("Inline tag cannot be empty");
      await Promise.all(tasks.map(async (task) => {
        if (task.content.includes(selectedTag)) {
          let newTaskContent = task.content.replace(selectedTag, "");
          newTaskContent = newTaskContent.replace(/\\/g, "");
          console.log("new task name: " + newTaskContent);
          await app.updateTask(task.uuid, { content: newTaskContent });
        }
      }));
      console.log("Inline tag removed!");
    },
    /**
     * Edits the task details of all selected tasks
     * All of the attributes that can be edited through this function are:
     * 
     * - `Hide Until` as a date
     * - `Priority` and `Urgency`
     * - `Duration` in minutes
     * @param {*} app 
     * @param {string} text 
     */
    async _batchEditTaskDetails(app, tasks) {
      const prompt = await app.prompt("Select the properties to edit", {
        inputs: [
          { label: "Hide task until (full dates only)", placeholder: "July 26", type: "text" },
          { label: "Duration (in minutes and numbers only)", type: "text" },
          { label: "important", type: "checkbox" },
          { label: "Urgent", type: "checkbox" },
          { label: "Score (numbers only)", type: "text" }
        ]
      });
      const [hideUntil, duration, priority, urgent, score] = prompt;
      let durationNumber;
      let scoreNumber;
      if (duration) {
        durationNumber = parseInt(duration);
        if (isNaN(durationNumber))
          throw new Error("Duration field must be a number");
      }
      if (score) {
        scoreNumber = parseInt(score);
        if (isNaN(scoreNumber))
          throw new Error("Score field must be a number");
      }
      await Promise.all(tasks.map(async (task) => {
        console.log(task);
        await app.updateTask(task.uuid, { important: priority, urgent });
        if (scoreNumber)
          await app.updateTask(task.uuid, { score });
        if (hideUntil) {
          let hideDate = /* @__PURE__ */ new Date(`${hideUntil}, 2024`);
          hideDate = hideDate.getTime() / 1e3;
          console.log("Hide date in seconds: " + hideDate);
          await app.updateTask(task.uuid, { hideUntil: hideDate });
        }
        if (durationNumber) {
          if (!task.startAt) {
            throw new Error("Can't set a duration for a task that isn't scheduled");
          }
          const startTime = task.startAt * 1e3;
          const durationDate = new Date(startTime + durationNumber * 60 * 1e3);
          console.log("Time to edit: ", durationDate);
          await app.updateTask(task.uuid, { endAt: Math.floor(durationDate.getTime() / 1e3) });
        }
      }));
    },
    /**
     * Gets the tasks from the selected note and transforms them into text
     * @param {*} app 
     * @param {string} noteUUID 
     * @returns {string} with the tasks, each separated by a line break
     */
    async _getTasksFromNote(app, noteUUID) {
      const noteTasks = await app.getNoteTasks({ uuid: noteUUID });
      if (!noteTasks)
        throw new Error("Current note has no tasks");
      const taskOptions = noteTasks.map((task) => ({
        label: task.content,
        type: "checkbox"
      }));
      const inputTasks = await app.prompt("Select the tasks you want to act on", {
        inputs: taskOptions
      });
      if (!inputTasks)
        throw new Error("Choose at least one tasks in order to proceed");
      const selectedTasks = noteTasks.filter((_, index) => inputTasks[index]);
      return selectedTasks;
    },
    /**
     * Transforms the tasks in string format into the original task object array
     * @param {*} app 
     * @param {string} text With the selected tasks separated by line breaks
     * @returns {tasks[]} Array with the selected tasks
     */
    async _transformTextIntoTaskArray(app, text) {
      const noteUUID = app.context.noteUUID;
      const noteTasks = await app.getNoteTasks({ uuid: noteUUID });
      if (!noteTasks)
        throw new Error("Choose at least one tasks in order to proceed");
      const textTaskArray = text.split("\n").map((line) => line.trim()).filter((line) => line.length > 0);
      const taskArray = noteTasks.filter((task) => {
        let taskContent = task.content.replace(/\\[\r\n]+/g, " ");
        taskContent = taskContent.replace(/(?:__|[*#])|\[(.*?)\]\(.*?\)|`([^`]*)`/gm, "$1$2");
        taskContent = taskContent.trim();
        return textTaskArray.includes(taskContent);
      });
      console.log("Chosen tasks:");
      console.log(taskArray);
      return taskArray;
    }
  };
  var plugin_default = plugin;
})();
