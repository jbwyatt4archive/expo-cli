/**
 * @flow
 */

import mkdirp from 'mkdirp';
import ncp from 'ncp';
import spawnAsync from '@exponent/spawn-async';
import path from 'path';
import runas from 'runas';

import ErrorCode from './ErrorCode';
import Logger from './Logger';
import NotificationCode from './NotificationCode';
import UserSettings from './UserSettings';
import XDLError from './XDLError';

const SOURCE_PATH = path.join(__dirname, '..', 'binaries', 'osx');
const INSTALL_PATH = '/usr/local/bin';

function _ncpAsync(source, dest) {
  return new Promise((resolve, reject) => {
    ncp(source, dest, (err) => {
      if (err) {
        reject();
      } else {
        resolve();
      }
    });
  });
}

function _assertPlatformSupported() {
  if (process.platform === 'darwin') {
    return;
  }

  throw new XDLError(ErrorCode.PLATFORM_NOT_SUPPORTED, 'Platform not supported.');
}

async function _binaryExistsAsync(name) {
  try {
    let result = await spawnAsync('which', [name]);
    return (result.stdout && result.stdout.length > 1);
  } catch (e) {
    console.log(e.toString());
    return false;
  }
}

function _exponentBinaryDirectory() {
  let dotExponentHomeDirectory = UserSettings.dotExponentHomeDirectory();
  let dir = path.join(dotExponentHomeDirectory, 'bin');
  mkdirp.sync(dir);
  return dir;
}

async function _installBinaryAsync(name) {
  if (await _binaryExistsAsync(name)) {
    return false;
  }

  try {
    let result = runas('/bin/ln', ['-s', path.join(_exponentBinaryDirectory(), name), path.join(INSTALL_PATH, name)], {
      admin: true,
    });

    return result === 0;
  } catch (e) {
    return false;
  }
}

export async function installShellCommandsAsync() {
  _assertPlatformSupported();

  await _ncpAsync(SOURCE_PATH, _exponentBinaryDirectory());

  let binaries = ['adb', 'watchman'];
  let installedBinaries = [];
  for (let i = 0; i < binaries.length; i++) {
    if (await _installBinaryAsync(binaries[i])) {
      installedBinaries.push(binaries[i]);
    }
  }

  if (installedBinaries.length === 0) {
    Logger.notifications.warn({code: NotificationCode.INSTALL_SHELL_COMMANDS_RESULT}, `Shell commands ${binaries.join(', ')} are already installed`);
  } else {
    Logger.notifications.info({code: NotificationCode.INSTALL_SHELL_COMMANDS_RESULT}, `Installed ${installedBinaries.join(', ')} to your shell`);
  }
}