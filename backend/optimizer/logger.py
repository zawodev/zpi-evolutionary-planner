import logging
import sys


class ColoredFormatter(logging.Formatter):
    """Custom colored formatter for logs"""
    
    # ANSI color codes
    COLORS = {
        'DEBUG': '\033[32m', # green
        'INFO': '\033[33m', # yellow
        'WARNING': '\033[93m', # bright yellow
        'ERROR': '\033[91m', # red
        'CRITICAL': '\033[95m', # magenta
    }
    RESET = '\033[0m'
    TIME_COLOR = '\033[36m'  # cyan for time
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.datefmt = '%H:%M:%S'
    
    def format(self, record):
        color = self.COLORS.get(record.levelname, '')
        reset = self.RESET
        time_color = self.TIME_COLOR
        
        asctime = self.formatTime(record, self.datefmt)
        formatted_message = f"{time_color}[{asctime}]{reset} {color}[{record.levelname}]{reset} {record.getMessage()}"
        return formatted_message


def get_logger(name: str = None):
    """Get a configured logger with colored output"""
    logger_name = name or 'optimizer'
    logger = logging.getLogger(logger_name)
    
    # only configure if not already configured
    if not logger.handlers:
        handler = logging.StreamHandler(sys.stdout)
        handler.setFormatter(ColoredFormatter())
        logger.addHandler(handler)
        logger.setLevel(logging.DEBUG)
        logger.propagate = False  # prevent duplicate logs
    
    return logger


# default logger for quick import
logger = get_logger('optimizer')
