const { Resolver } = require('node:dns').promises;
const net = require('node:net');

// Optional per-connection DNS override for networks that refuse cloud DB names.
// The original hostname still reaches pg/TLS for SNI and certificate validation.
function createDatabaseStream(servers) {
  const resolver = new Resolver({ timeout: 3000, tries: 2 });
  resolver.setServers(servers);
  return () => {
    const socket = new net.Socket();
    const connect = socket.connect.bind(socket);
    socket.connect = (port, host) => connect({
      port,
      host,
      lookup(hostname, options, callback) {
        resolver.resolve4(hostname).then(addresses => {
          if (options.all) callback(null, addresses.map(address => ({ address, family: 4 })));
          else callback(null, addresses[0], 4);
        }, callback);
      },
    });
    return socket;
  };
}

module.exports = { createDatabaseStream };
