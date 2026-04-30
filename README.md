# Oaslananka Lab Repo Steward

Private operations repository for managing repository quality, automation prompts, multi-repo health checks, release verification, and maintainer-only policies.

This repository is private by design.

It may contain:
- private agent prompts
- maintainer-only policies
- repository tier definitions
- cleanup scripts
- release verification scripts
- multi-repo status tooling
- AI-residue and public-hygiene scanning rules

It must not contain:
- production secrets
- API keys
- raw access tokens
- credentials
- personal access tokens
- private keys

Secrets should live in Doppler or another dedicated secret manager.
