#!/bin/bash

export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

export KB_ROOT_PATH="/home/manuel/repos/webtea/mcp-knowledge-base-server/kb"
export DOTENV_CONFIG_QUIET="true"

exec node /home/manuel/repos/webtea/mcp-knowledge-base-server/dist/index.js