global._try = (func) => {
  try {
    func();
  } catch (ex) {
    global.setResult({
      error: {
        name: ex.name,
        message: ex.message,
        stack: ex.stack
      }
    });
  }
};

global._execute = () => {
  global._try(() => {
    eval(global._code);
  });
};

global.dispatchSync = (name, args) => {
  const parameters = [ JSON.stringify([ name, ...(args || []) ]) ];

  const result = global._dispatchSync.apply(global, parameters);

  if (result == null) {
    return null;
  }

  const [error, value] = JSON.parse(result);

  if (error) {
    throw new Error(error.message);
  }

  return value;
}

global.dispatchAsync = (name, args, callback) => {
  if (typeof callback !== 'function') {
    callback = () => {};
  }

  const parameters = [ JSON.stringify([ name, ...(args || []) ]) ];

  const wrappedCallback = (args) => {
    global._try(() => {
      callback.apply(null, JSON.parse(args));
    });
  };

  parameters.push(wrappedCallback);

  const result = global._dispatchAsync.apply(global, parameters);

  return result != null ? JSON.parse(result) : null;
}

global.httpRequest = (options, callback) => {
  const parameters = [ JSON.stringify([ options ]) ];

  if (callback) {
    const wrappedCallback = (args) => {
      global._try(() => {
        callback.apply(null, JSON.parse(args));
      });
    };

    parameters.push(wrappedCallback);
  }

  const result = global._httpRequest.apply(global, parameters);

  if (result == null) {
    return null;
  }

  const [error, response] = JSON.parse(result);

  if (!callback && error) {
    throw new Error(error.message);
  }

  return response;
};

global.setResult = (result) => {
  return global._setResult(result != null ? JSON.stringify(result) : null);
};

global.setTimeout = (callback, timeout) => {
  const handler = () => {
    global._try(callback);
  };

  return global._setTimeout(handler, timeout);
};

global.clearTimeout = (id) => {
  return global._clearTimeout(id);
};

global.console = {
  log: (...args) => {
    global._log(JSON.stringify(args));
  },
  error: (...args) => {
    global._error(JSON.stringify(args));
  }
};

global.define = (name) => {
  global[name] = (...args) => {
    return global.dispatchSync(name, args);
  };
};

global.defineBlocking = global.define;

global.defineAsync = (name) => {
  global[name] = (...args) => {
    const callback = args.pop();

    return global.dispatchAsync(name, args, callback);
  };
};
