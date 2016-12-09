import Emitter from 'events';

export default class extends Emitter {
  constructor(mdns, mdnsType, serviceType = null) {
    super();
    this.mdnsType = mdnsType;
    this.ready = false;

    if (this.mdnsType === 'mdnsjs') {
      this.browser = mdns.createBrowser(serviceType);
      this.browser.on('ready', () => {
        this.ready = true;
      });
    } else {
      const sequence = [
        mdns.rst.DNSServiceResolve(), // eslint-disable-line
        'DNSServiceGetAddrInfo' in mdns.dns_sd ? mdns.rst.DNSServiceGetAddrInfo() : mdns.rst.getaddrinfo({ families: [0] }), // eslint-disable-line
        mdns.rst.makeAddressesUnique(),
      ];
      try {
        this.browser = mdns.createBrowser(serviceType, { resolverSequence: sequence });
        this.browser.on('error', (e) => { console.error(e); }); // eslint-disable-line no-console
        this.ready = true;
      } catch (e) {
        console.error(e); // eslint-disable-line no-console
      }
    }
  }

  get ready() {
    return this._ready || false;
  }

  set ready(newReady) {
    this._ready = newReady;
    if (newReady) {
      this.emit('ready');
    }
  }

  browse() {
    if (!this.ready) {
      return this.once('ready', this.browse.bind(this));
    }
    if (this.mdnsType === 'mdnsjs') {
      this.browser.discover();
      this.browser.on('update', this.serviceUp.bind(this));
    } else if (this.mdnsType === 'mdns') {
      this.browser.on('serviceUp', this.serviceUp.bind(this));
      this.browser.on('serviceDown', this.serviceDown.bind(this));
      this.browser.start();
    }
  }

  serviceUp(service) {
    this.emit('serviceUp', this._normalizeService(service));
  }

  serviceDown(service) {
    this.emit('serviceDown', this._normalizeService(service));
  }

  stop() {
    this.browser.stop();
  }

  _normalizeService(service) {
    const normalized = {
      addresses: service.addresses,
      fullname: service.fullname,
      interfaceIndex: service.interfaceIndex,
      networkInterface: service.networkInterface,
      port: service.port,
    };
    normalized.name = service.name || service.fullname.substring(0, service.fullname.indexOf('.'));
    normalized.txtRecord = service.txtRecord || (() => {
      const records = {};
      service.txt.forEach((item) => {
        const key = item.substring(0, item.indexOf('='));
        const value = item.substring(item.indexOf('=') + 1);
        records[key] = value;
      });
      return records;
    })();
    return normalized;
  }
}
