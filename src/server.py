import sys
import json
import argparse
from camoufox.server import launch_server

# Set UTF-8 encoding for console output
if sys.platform == 'win32':
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer)
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer)


def parse_arguments():
    """
    Parse command line arguments for server configuration.

    Returns:
        argparse.Namespace: Parsed command line arguments
    """
    parser = argparse.ArgumentParser()
    parser.add_argument('--config', type=str,
                        help='JSON configuration from Node.js')
    return parser.parse_args()


def load_config():
    """
    Load server configuration from command line arguments.

    Returns:
        dict: Processed configuration dictionary
    """
    args = parse_arguments()
    try:
        if args.config:
            # Strip any extra quotes and whitespace
            config_str = args.config.strip().strip('"\'')
            return json.loads(config_str)
        return {}
    except json.JSONDecodeError as e:
        print(f"Error parsing JSON configuration: {e}")
        print(f"Received config string: {args.config}")
        return {}


def main():
    """
    Main entry point for the automation server.

    Loads configuration and launches the server with the specified settings.
    """
    config = load_config()

    launch_server(
        # Browser configuration
        headless=config.get('headless', True),
        geoip=config.get('geoip', True),
        proxy=config.get('proxy'),

        # Behavior configuration
        humanize=config.get('humanize', True),
        showcursor=config.get('showcursor', True),

        # Performance settings
        block_images=config.get('blockImages', False),

        # Feature settings
        main_world_eval=config.get('mainWorldEval', True),
        debug=config.get('debug', False)
    )


if __name__ == "__main__":
    main()
