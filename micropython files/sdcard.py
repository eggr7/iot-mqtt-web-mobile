import machine

class SDCard:
    def __init__(self, spi, cs):
        self.spi = spi
        self.cs = machine.Pin(cs, machine.Pin.OUT)

    def readblocks(self, block_num, buf):
        self.cs.off()
        self.spi.write(b'\x51' + block_num.to_bytes(4, 'big') + b'\x00')
        self.spi.readinto(buf)
        self.cs.on()

    def writeblocks(self, block_num, buf):
        self.cs.off()
        self.spi.write(b'\x58' + block_num.to_bytes(4, 'big') + b'\x00')
        self.spi.write(buf)
        self.cs.on()

    def ioctl(self, op, arg):
        if op == 4:  # Get number of blocks
            return 32768  # Tamaño de 16MB como ejemplo
        if op == 5:  # Block size
            return 512
