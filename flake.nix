{
  description = "Glowup dev shell: Node.js, git, GitHub CLI and the Vercel CLI";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs = { self, nixpkgs }:
    let
      systems = [ "x86_64-linux" "aarch64-linux" "x86_64-darwin" "aarch64-darwin" ];
      forAll = f: nixpkgs.lib.genAttrs systems (system: f nixpkgs.legacyPackages.${system});
    in {
      devShells = forAll (pkgs:
        let
          # The Vercel CLI is not packaged in nixpkgs; pin it through npx.
          vercel = pkgs.writeShellScriptBin "vercel" ''
            exec ${pkgs.nodejs_24}/bin/npx --yes vercel@65.2.0 "$@"
          '';
        in {
          default = pkgs.mkShell {
            packages = [ pkgs.nodejs_24 pkgs.git pkgs.gh pkgs.curl vercel ];
            shellHook = ''
              export NEXT_TELEMETRY_DISABLED=1
              echo "Glowup shell: node $(node -v), run 'vercel login' then 'npm run dev'"
            '';
          };
        });
    };
}
