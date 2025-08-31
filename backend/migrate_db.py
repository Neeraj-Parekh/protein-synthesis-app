#!/usr/bin/env python3
"""
Database migration script for Protein Synthesis Web Application
Uses Alembic for database schema migrations
"""
import os
import sys
from pathlib import Path

# Add the backend directory to Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

def create_alembic_config():
    """Create Alembic configuration file"""
    alembic_dir = backend_dir / "alembic"
    alembic_dir.mkdir(exist_ok=True)

    # Create alembic.ini
    alembic_ini = f"""# A generic, single database configuration.

[alembic]
# path to migration scripts
script_location = alembic

# template used to generate migration files
# file_template = %%(rev)s_%%(slug)s

# timezone to use when rendering the date
# within the migration file as well as the filename.
# string value is passed to dateutil.tz.gettz()
# leave blank for localtime
timezone = UTC

# max length of characters to apply to the
# "slug" field
# truncate_slug_length = 40

# set to 'true' to run the environment file as a
# script, rather than importing it.
# script_run_as_module = false

# revision environment configuration
# (this setting is revised for async support)
revision_environment = true

# Controls automatic generation of candidate revisions
# (beta feature)
# generate_revision_on_startup = false

# Database URL for migrations
sqlalchemy.url = {os.getenv('DATABASE_URL', 'sqlite:///./protein_synthesis.db')}

[post_write_hooks]
# post_write_hooks defines scripts or Python functions that are run
# on newly generated revision scripts. See the documentation for further
# detail and examples

# format using "black" - use the console_scripts runner, against the "black" entrypoint
# hooks = black
# black.type = console_scripts
# black.entrypoint = black
# black.options = -l 79

[loggers]
keys = root,sqlalchemy,alembic

[handlers]
keys = console

[formatters]
keys = generic

[logger_root]
level = WARN
handlers = console
qualifier =

[logger_sqlalchemy]
level = WARN
handlers =
qualifier = sqlalchemy

[logger_alembic]
level = INFO
handlers =
qualifier = alembic

[handler_console]
class = StreamHandler
args = (sys.stderr,)
level = NOTSET
formatter = generic
qualifier =

[formatter_generic]
format = %(levelname)-5.5s [%(name)s] %(message)s
datefmt = %H:%M:%S
"""

    with open(backend_dir / "alembic.ini", "w") as f:
        f.write(alembic_ini)

    # Create env.py
    env_py = '''import os
import sys
from logging.config import fileConfig

from sqlalchemy import engine_from_config
from sqlalchemy import pool

from alembic import context

# Add the backend directory to Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

# Import all models
from models.protein import Base as ProteinBase
from models.user import Base as UserBase

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Interpret the config file for Python logging.
# This line sets up loggers basically.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# add your model's MetaData object here
# for 'autogenerate' support
target_metadata = [ProteinBase.metadata, UserBase.metadata]

# other values from the config, defined by the needs of env.py,
# can be acquired:
# my_important_option = config.get_main_option("my_important_option")
# ... etc.


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode.

    This configures the context with just a URL
    and not an Engine, though an Engine is acceptable
    here as well.  By skipping the Engine creation
    we don't even need a DBAPI to be available.

    Calls to context.execute() here emit the given string to the
    script output.

    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode.

    In this scenario we need to create an Engine
    and associate a connection with the context.

    """
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection, target_metadata=target_metadata
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
'''

    with open(alembic_dir / "env.py", "w") as f:
        f.write(env_py)

    # Create script.py.mako template
    script_mako = '''"""${message}

Revision ID: ${up_revision}
Revises: ${down_revision | comma,n}
Create Date: ${create_date}

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
${imports if imports else ""}

# revision identifiers, used by Alembic.
revision: str = ${repr(up_revision)}
down_revision: Union[str, None] = ${repr(down_revision)}
branch_labels: Union[str, Sequence[str], None] = ${repr(branch_labels)}
depends_on: Union[str, Sequence[str], None] = ${repr(depends_on)}


def upgrade() -> None:
    ${upgrades if upgrades else "pass"}


def downgrade() -> None:
    ${downgrades if downgrades else "pass"}
'''

    with open(alembic_dir / "script.py.mako", "w") as f:
        f.write(script_mako)

    print("✅ Alembic configuration created successfully")

def create_initial_migration():
    """Create initial migration for all models"""
    from alembic.config import Config
    from alembic import command

    # Configure Alembic
    alembic_cfg = Config("alembic.ini")

    # Generate initial migration
    try:
        command.revision(alembic_cfg, message="Initial migration", autogenerate=True)
        print("✅ Initial migration created successfully")
    except Exception as e:
        print(f"❌ Failed to create initial migration: {e}")

def main():
    """Main function"""
    if len(sys.argv) > 1:
        command = sys.argv[1]

        if command == "init":
            create_alembic_config()
        elif command == "migrate":
            create_initial_migration()
        elif command == "upgrade":
            from alembic.config import Config
            from alembic import command
            alembic_cfg = Config("alembic.ini")
            command.upgrade(alembic_cfg, "head")
            print("✅ Database upgraded successfully")
        elif command == "downgrade":
            from alembic.config import Config
            from alembic import command
            alembic_cfg = Config("alembic.ini")
            command.downgrade(alembic_cfg, "base")
            print("✅ Database downgraded successfully")
        else:
            print("Usage: python migrate_db.py [init|migrate|upgrade|downgrade]")
    else:
        print("Usage: python migrate_db.py [init|migrate|upgrade|downgrade]")

if __name__ == "__main__":
    main()
