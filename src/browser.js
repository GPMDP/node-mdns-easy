import Emitter from 'events';

export default class extends Emitter {
  constructor(mdns, mdnsType, serviceType = null) {
    this.mdnsType = mdnsType;
    this.browser = mdns.createBrowser(serviceType);
  }

  browse() {
    if (this.mdnsType === 'mdnsjs') {
      this.browser.on('ready', () => {
        this.browser.discover();
      });
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
    this.emit('serviceDown', this._normalizedService(service));
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
