import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  readField,
  numberOf,
  kmOf,
  isOpen,
  readVehicleInfo,
  readWarnings,
  serviceLevel,
  readLocation,
  summarize,
} from '../src/vehicle.js';
import { rawOf, infoOf, vehicleOf, capabilitiesOf, VIN, copy } from './helpers/fixtures.js';

test('reads the fields: strings to numbers, UNSPECIFIED and errors as unknown', () => {
  assert.equal(numberOf({ value: '47.3', unit: 'l' }), 47.3);
  assert.equal(numberOf({ value: 'abc' }), null);
  assert.equal(readField({ value: 'UNSPECIFIED' }), null);
  assert.equal(readField({ status: 'ERROR', code: 'NOT_SUPPORTED' }), null);
  assert.equal(readField(undefined), null);
  assert.equal(
    readField({ value: 1, updatedAt: '2025-07-02T08:51:23Z' }).at,
    Date.parse('2025-07-02T08:51:23Z'),
  );
  assert.equal(isOpen({ value: 'AJAR' }), true);
  assert.equal(isOpen({ value: 'CLOSED' }), false);
  assert.equal(isOpen({ value: 'UNSPECIFIED' }), null);
});

test('converts miles to km', () => {
  assert.equal(Math.round(kmOf({ value: 150, unit: 'mi' })), 241);
  assert.equal(Math.round(kmOf({ value: 26, unit: 'miles' })), 42);
  assert.equal(kmOf({ value: 327, unit: 'km' }), 327);
});

test('reads what a car is and supports', () => {
  const xc40 = infoOf('xc40_electric_2024');
  assert.equal(xc40.model, 'XC40');
  assert.equal(xc40.modelYear, 2024);
  assert.ok(xc40.hasBattery && !xc40.hasCombustion);
  assert.equal(xc40.batteryCapacityKwh, 81.608);
  assert.ok(xc40.energySupported.includes('chargingStatus'), 'chargingSystemStatus is renamed');
  assert.ok(xc40.commands.includes('LOCK'));

  const phev = infoOf('xc90_phev_2024');
  assert.ok(phev.hasBattery && phev.hasCombustion);
  assert.ok(!phev.energySupported.includes('chargingPower'));

  const diesel = infoOf('s90_diesel_2018');
  assert.ok(!diesel.hasBattery && diesel.hasCombustion);
  assert.equal(diesel.imageUrl, null, 'an empty image URL is no image');

  const ex30 = infoOf('ex30_2024');
  assert.ok(ex30.hasBattery, 'fuelType NONE is electric');

  const unsupported = readVehicleInfo(VIN, vehicleOf('xc40_electric_2024'), {
    energyCapabilities: { ...capabilitiesOf('xc40_electric_2024'), isSupported: false },
  });
  assert.deepEqual(unsupported.energySupported, []);
});

test('summarizes an electric car', () => {
  const info = infoOf('xc40_electric_2024');
  const snapshot = summarize(info, rawOf('xc40_electric_2024'));
  assert.equal(snapshot.lock, 'locked');
  assert.equal(snapshot.doorsOpen, false);
  assert.equal(snapshot.windowsOpen, false);
  assert.equal(snapshot.openings.sunroof, null, 'UNSPECIFIED sunroof');
  assert.deepEqual(snapshot.openList, []);
  assert.equal(snapshot.engineRunning, false);
  assert.equal(snapshot.battery.level, 53);
  assert.equal(snapshot.battery.rangeKm, 250, 'the trip computer wins over the Energy API miles');
  assert.equal(snapshot.battery.energyKwh, 43.3);
  assert.equal(snapshot.charge.connection, 'connected');
  assert.equal(snapshot.charge.status, 'charging');
  assert.equal(snapshot.charge.type, 'ac');
  assert.equal(snapshot.charge.powerKw, 1.39);
  assert.equal(snapshot.charge.currentLimitA, 32);
  assert.equal(snapshot.charge.targetLevel, 90);
  assert.equal(snapshot.charge.minutesToTarget, 1440);
  assert.equal(snapshot.fuel.liters, null, 'no fuel on an electric car');
  assert.equal(snapshot.odometerKm, 30000);
  assert.equal(snapshot.statistics.averageEnergy, 22.6);
  assert.equal(snapshot.service.level, 'ok');
  assert.equal(snapshot.service.distanceKm, 29000);
  assert.equal(snapshot.service.days, 690, '23 months');
  assert.deepEqual(snapshot.warnings, []);
  assert.equal(snapshot.availability.status, 'available');
  assert.equal(snapshot.location.latitude, 57.72537482589284);
  assert.equal(snapshot.location.heading, 90);
});

test('summarizes a plug-in hybrid: battery and fuel, unsupported energy fields left out', () => {
  const info = infoOf('xc90_phev_2024');
  const snapshot = summarize(info, rawOf('xc90_phev_2024'));
  assert.equal(snapshot.battery.level, 87.3);
  assert.equal(snapshot.battery.rangeKm, 43);
  assert.equal(snapshot.charge.connection, 'disconnected');
  assert.equal(snapshot.charge.status, 'idle');
  assert.equal(snapshot.charge.powerKw, null);
  assert.equal(snapshot.charge.targetLevel, null, 'ERROR_READING_PROPERTY');
  assert.equal(snapshot.fuel.liters, 47.3);
  assert.equal(snapshot.fuel.rangeKm, 804);
});

test('summarizes a diesel: no battery at all', () => {
  const info = infoOf('s90_diesel_2018');
  const snapshot = summarize(info, rawOf('s90_diesel_2018'));
  assert.equal(snapshot.battery.level, null, 'the fuel resource battery level is ignored');
  assert.equal(snapshot.charge.status, null);
  assert.equal(snapshot.fuel.rangeKm, 147);
  assert.equal(snapshot.service.days, 17);
});

test('falls back to the Energy API range, converted, without trip computer', () => {
  const info = infoOf('xc40_electric_2024');
  const raw = rawOf('xc40_electric_2024');
  delete raw.statistics.distanceToEmptyBattery;
  assert.equal(summarize(info, raw).battery.rangeKm, 241);
});

test('lists the openings and the warnings', () => {
  const info = infoOf('xc40_electric_2024');
  const raw = rawOf('xc40_electric_2024');
  raw.doors.centralLock.value = 'UNLOCKED';
  raw.doors.tailgate.value = 'AJAR';
  raw.windows.rearLeftWindow.value = 'OPEN';
  raw.tyres.frontLeft.value = 'LOW_PRESSURE';
  raw.engine.oilLevelWarning.value = 'SERVICE_REQUIRED';
  raw.warnings.brakeLightLeftWarning.value = 'FAILURE';
  raw.diagnostics.serviceWarning.value = 'DISTANCE_DRIVEN_ALMOST_TIME_FOR_SERVICE';
  const snapshot = summarize(info, raw);
  assert.equal(snapshot.lock, 'unlocked');
  assert.deepEqual(snapshot.openList, ['tailgate', 'rearLeftWindow']);
  assert.equal(snapshot.windowsOpen, true);
  assert.equal(snapshot.doorsOpen, false, 'the tailgate is not a door');
  assert.deepEqual(snapshot.warnings.sort(), [
    'brakeLightLeftWarning',
    'oilLevelWarning',
    'service',
    'tyre:frontLeft',
  ]);
  assert.equal(snapshot.service.level, 'soon');
});

test('reads the service levels', () => {
  assert.equal(serviceLevel('NO_WARNING'), 'ok');
  assert.equal(serviceLevel('ENGINE_HOURS_TIME_FOR_SERVICE'), 'due');
  assert.equal(serviceLevel('REGULAR_MAINTENANCE_OVERDUE_FOR_SERVICE'), 'overdue');
  assert.equal(serviceLevel('UNKNOWN_WARNING'), null);
  assert.deepEqual(
    readWarnings({ diagnostics: { serviceWarning: { value: 'UNKNOWN_WARNING' } } }),
    [],
  );
});

test('ignores a missing or absurd position', () => {
  assert.equal(readLocation({}), null);
  assert.equal(readLocation({ geometry: { coordinates: [0, 0, 0] } }), null);
  assert.equal(readLocation({ geometry: { coordinates: [200, 10] } }), null);
});

test('an empty car reads as all unknown, never as zeros', () => {
  const snapshot = summarize(infoOf('xc40_electric_2024'), {});
  assert.equal(snapshot.lock, null);
  assert.equal(snapshot.battery.level, null);
  assert.equal(snapshot.odometerKm, null);
  assert.equal(snapshot.doorsOpen, null);
  assert.equal(snapshot.location, null);
  assert.equal(snapshot.updatedAt, null);
  assert.deepEqual(copy(snapshot.warnings), []);
});
