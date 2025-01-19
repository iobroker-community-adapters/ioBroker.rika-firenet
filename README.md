# ioBroker.rika-firenet

[![NPM version](http://img.shields.io/npm/v/iobroker.rika-firenet.svg)](https://www.npmjs.com/package/iobroker.rika-firenet)
[![Downloads](https://img.shields.io/npm/dm/iobroker.rika-firenet.svg)](https://www.npmjs.com/package/iobroker.rika-firenet)
![Number of Installations (latest)](http://iobroker.live/badges/rika-firenet-installed.svg)
![Number of Installations (stable)](http://iobroker.live/badges/rika-firenet-stable.svg)
[![Dependency Status](https://img.shields.io/david/xsawa32/iobroker.rika-firenet.svg)](https://david-dm.org/xsawa32/iobroker.rika-firenet)

[![NPM](https://nodei.co/npm/iobroker.rika-firenet.png?downloads=true)](https://nodei.co/npm/iobroker.rika-firenet/)

## RIKA-Firenet adapter for ioBroker

Control your RIKA stoves over RIKA-Firenet.

## Information
* Get Informations like controls, sensors, features from your RIKA stove
* Set controls like on, off, heatingPower...

## Requirements
* You need a RIKA stove with RIKA-Firenet and an account at https://www.rika-firenet.com
* Polling-intervall minimum is 1 minute so you do not appear to be a DOS-Attacker against their websites.
* If working with javascript or blockly, change only 1 control simultaneously, because complete json have to be uploaded after modifying a control value (i'm working on this problem)
* This Adapter was developed for my RIKA PARO, but should also work with other RIKA stoves.

Fill textboxes in Adapter-Config
* Username: (E-Mail for your Rika account)
* Password: (Password for your Rika account)
* Stove-ID: (go to your Rika account and find out)
* Polling-Interval: (min 1 Minute)

## Download Pictures and states for vizualisation
https://www.rika-firenet.com/images/status/Visu_Off.svg
use if sensors.statusMainState = 1 and sensors.statusSubState = 0 (Stove is off, Ofen ist aus)

https://www.rika-firenet.com/images/status/Visu_Standby.svg
use if sensors.statusMainState = 1 and sensors.statusSubState = 1 (Standby, Ofen auf Standby)

https://www.rika-firenet.com/images/status/Visu_Ignition.svg
use if sensors.statusMainState = 2 (Ignition, Zündung)

https://www.rika-firenet.com/images/status/Visu_Ignition.svg
use if sensors.statusMainState = 3 (Starting, Startphase)

https://www.rika-firenet.com/images/status/Visu_Bake.svg 

https://www.rika-firenet.com/images/status/Visu_HeatingUp.svg

https://www.rika-firenet.com/images/status/Visu_Control.svg
use if sensors.statusMainState = 4 (Regular Operationmode, Regelbetrieb)

https://www.rika-firenet.com/images/status/Visu_Clean.svg
use if sensors.statusMainState = 5 (Cleaning)

https://www.rika-firenet.com/images/status/Visu_BurnOff.svg
use if sensors.statusMainState = 6 (Burn Off, Ausbrand) 

https://www.rika-firenet.com/images/status/Visu_SpliLog.svg
use if sensors.statusMainState = 11, 13, 14, 16, 17 or 50 (Wood-log check, Scheitholzcheck)

https://www.rika-firenet.com/images/status/Visu_SpliLog.svg
use if sensors.statusMainState = 20 or 21 (Operation with wood-logs, Scheitholzbetrieb)

## Here's an example for vis (basic image):
![VisBasic Image](admin/visuexample.PNG)

## Detailed state-picture-combinations
* If not logged in log in at Rika WebLogin https://www.rika-firenet.com/web/login
* open https://www.rika-firenet.com/web/stove/[YOURSTOVEID] (use your stoveid instead without brackets)
* View sourcecode of this site (right mouse click - sourcecode)
* Find the sensors.statusMainState and sensors.statusSubState picture-combinations

## Json with all current states of your stove
* If not logged in log in at Rika WebLogin https://www.rika-firenet.com/web/login
* open https://www.rika-firenet.com/api/client/[YOURSTOVEID]/status (use your stoveid instead without brackets)

## ToDo
* setting more than 1 state at the same time with javascript or blockly
* save password encrypted

## Credits

This adapter would not have been possible without the great work of @xsawa32 (https://github.com/xsawa32), who created pre V1.x.x releases of this adapter.

## Changelog
<!--
	Placeholder for the next version (at the beginning of the line):
    ### **WORK IN PROGRESS**
-->
### **WORK IN PROGRESS**
* (dev2dev) Fix adapter checker

### 1.0.0-alpha.4 (2025-01-19)
* (dev2dev) Bump release#

### 1.0.0-alpha.3 (2025-01-19)
* (dev2dev) Reduced writeable states

### 1.0.0-alpha.2 (2025-01-19)
* (dev2dev) Extended logging
* (dev2dev) Fixed writing value to stove
* (dev2dev) Changed cookie management

### 1.0.0-alpha.1 (2025-01-17)

* (dev2dev) Changed http-requests from request to axios
* (dev2dev) Added cookie management for recurring requests

### 1.0.0-alpha.0
* (mcm1957) BREAKING: password is stored encrypted now, please reenter once.
* (mcm1957) AdminUI has been migrated to jsonConfig to meet responsive design guide.
* (mcm1957) Adapter requires node.js 20, js-controller 6 and and admin 6 now.
* (mcm1957) Adapter has been move to iobroker-community-adapters organization
* (mcm1957) Dependencies have been updated

## License
MIT License

Copyright (c) 2024-2025, iobroker-community-adapters <iobroker-community-adapters@gmx.de>  
Copyright (c) 2020 Andreas Wass

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
