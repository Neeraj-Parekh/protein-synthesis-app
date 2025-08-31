"""
Simple test to ensure test discovery works
"""
import pytest


def test_basic_math():
    """Test basic math operations"""
    assert 1 + 1 == 2
    assert 2 * 3 == 6
    assert 10 / 2 == 5


def test_string_operations():
    """Test string operations"""
    assert "hello" + " world" == "hello world"
    assert "test".upper() == "TEST"
    assert "TEST".lower() == "test"


def test_list_operations():
    """Test list operations"""
    test_list = [1, 2, 3]
    assert len(test_list) == 3
    assert test_list[0] == 1
    test_list.append(4)
    assert len(test_list) == 4


class TestBasicClass:
    """Test basic class functionality"""
    
    def test_class_creation(self):
        """Test basic class creation"""
        class TestClass:
            def __init__(self, value):
                self.value = value
            
            def get_value(self):
                return self.value
        
        obj = TestClass("test")
        assert obj.get_value() == "test"
    
    def test_inheritance(self):
        """Test basic inheritance"""
        class Parent:
            def parent_method(self):
                return "parent"
        
        class Child(Parent):
            def child_method(self):
                return "child"
        
        child = Child()
        assert child.parent_method() == "parent"
        assert child.child_method() == "child"