# shellcheck shell=bash

prepare_secret_service_packages() {
  local package status
  local missing=()
  local packages=(dbus-x11 gnome-keyring libsecret-tools)
  local apt_options=(-o Acquire::Retries=2 -o Acquire::http::Timeout=15
    -o Acquire::https::Timeout=15 -o DPkg::Lock::Timeout=30)

  for package in "${packages[@]}"; do
    if [[ "$(dpkg-query -W -f='${Status}' "$package" 2>/dev/null)" != 'install ok installed' ]]; then
      missing+=("$package")
    fi
  done
  if ((${#missing[@]} == 0)); then
    debug 'Secret Service packages are already installed; skipping APT'
    return 0
  fi

  # Run the deadline as root too: an unprivileged timeout cannot stop sudo's children.
  if run_setup_command sudo -n timeout --kill-after=10s 180s \
    apt-get "${apt_options[@]}" -o APT::Update::Error-Mode=any update; then
    if run_setup_command sudo -n timeout --kill-after=10s 180s \
      apt-get "${apt_options[@]}" install --no-install-recommends --yes "${missing[@]}"; then
      return 0
    else
      status=$?
      error_message "Secret Service package installation failed (exit $status)"
    fi
  else
    status=$?
    error_message "Secret Service package index update failed (exit $status)"
  fi

  # Compare mirror resolution with an unrelated host without dumping host configuration.
  for package in azure.archive.ubuntu.com archive.ubuntu.com security.ubuntu.com github.com; do
    printf 'package setup resolver diagnostic: %s\n' "$package" >&2
    debug_enabled=true run_setup_command timeout 5 getent ahosts "$package" \
      || error_message "resolver lookup failed for $package"
  done
  return "$status"
}
