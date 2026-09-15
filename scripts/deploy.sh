#!/usr/bin/env bash
# Forwarding script to root deploy.sh
exec bash "$(dirname "$0")/../deploy.sh" "$@"
