# Minesweeper — Multi-Platform with Arduino and Bluetooth

Academic project developed for the **Computer Organization** course at the Universidad de San Carlos de Guatemala.

This repository contains a multi-platform implementation of the classic Minesweeper game, integrating hardware, mobile, and web interfaces. The project was developed collaboratively as a group assignment.

---

## Overview

The system consists of three interconnected layers: a **Python/Flask backend** that communicates with a physical **Arduino** board over serial port to control the game state; a **React Native mobile app** that connects to the Arduino via Bluetooth; and a **React web frontend** that interacts with the Flask API over HTTP.

The Arduino hardware manages the physical representation of the Minesweeper board, while the software layers provide the user interfaces for interaction.

---

## Architecture

```
[ React Web Frontend ]         [ React Native Mobile App ]
         |  HTTP                          |  Bluetooth Classic
         v                               v
[ Python/Flask Backend ]         [ Arduino Board ]
         |  Serial (USB)                 |
         +-------------------------------+
                   (Game State Sync)
```

---

## Key Features

- Automatic Arduino port detection and serial connection management
- REST API for board control: new game, add bomb, verify cell, load configuration from file
- React Native mobile app with Bluetooth Classic device discovery and board interaction
- React web frontend for browser-based gameplay
- Hardware circuit designed in Proteus
- State synchronization between backend and Arduino on reconnection

---

## Technologies

- **Backend:** Python, Flask, pyserial
- **Web Frontend:** React (JavaScript), CSS
- **Mobile App:** React Native (TypeScript), react-native-bluetooth-classic
- **Hardware:** Arduino, Proteus (circuit design)

---

## Repository Structure

```
minesweeper-arduino-bluetooth/
├── App/                        # React Native mobile application
│   └── src/Pantallas/
│       ├── Inicio.tsx          # Home screen
│       ├── Juego.tsx           # Game screen with Bluetooth control
│       └── Informacion.tsx     # Info screen
├── PaginaWeb/                  # Web interface
│   ├── app.py                  # Flask backend server
│   └── buscaminas-frontend/    # React web frontend
├── Proteus/                    # Hardware circuit project file
├── Documentacion/              # Technical documentation (PDF)
└── README.md
```

---

## Academic Context

| Field       | Detail                                         |
|-------------|------------------------------------------------|
| Course      | Computer Organization (ORGA)                   |
| Institution | Universidad de San Carlos de Guatemala         |
| Type        | Group project                                  |
