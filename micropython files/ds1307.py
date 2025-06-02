import machine
import utime

class DS1307:
    def __init__(self, i2c, addr=0x68):
        self.i2c = i2c
        self.addr = addr

    def obtener_hora(self):
        data = self.i2c.readfrom_mem(self.addr, 0x00, 7)
        return "{:02}:{:02}:{:02}".format(self.bcd_to_dec(data[2]), self.bcd_to_dec(data[1]), self.bcd_to_dec(data[0]))

    def obtener_fecha(self):
        data = self.i2c.readfrom_mem(self.addr, 0x04, 3)
        return "{:02}/{:02}/20{:02}".format(self.bcd_to_dec(data[2]), self.bcd_to_dec(data[1]), self.bcd_to_dec(data[0]))

    def establecer_hora(self, hora, minuto, segundo):
        data = bytearray([self.dec_to_bcd(segundo), self.dec_to_bcd(minuto), self.dec_to_bcd(hora)])
        self.i2c.writeto_mem(self.addr, 0x00, data)

    def establecer_fecha(self, dia, mes, anio):
        anio = anio - 2000  # El DS1307 usa años en formato "00-99"
        data = bytearray([self.dec_to_bcd(dia), self.dec_to_bcd(mes), self.dec_to_bcd(anio)])
        self.i2c.writeto_mem(self.addr, 0x04, data)

    def bcd_to_dec(self, bcd):
        return (bcd // 16) * 10 + (bcd % 16)

    def dec_to_bcd(self, dec):
        return (dec // 10) * 16 + (dec % 10)
